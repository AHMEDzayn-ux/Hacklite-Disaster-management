import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useDisasterStore } from '@/store';
import {
    DetailShell, DetailHeader, DetailLoading, DetailNotFound, MetaDot,
    InfoCard, KeyValueRow, MetricCard, StatusChip, Chip,
    Timeline, TimelineItem, Button, ConfirmDialog, Field,
    PhotoCard, WeatherCard, LocationCard,
} from '@/components/detail/DetailKit';
import { INPUT, useWeather, formatDateTime, formatTime, timeSince } from '@/lib/detailKit';
import {
    IconSiren, IconCheck, IconUsers, IconFileText, IconClipboardList,
    IconPhone, IconCalendar, IconCamera, IconMapPin, IconClock,
} from '@/components/icons/Icons';

// Severity drives the loudest colour on the page, so it is the only place
// red is allowed: critical/high are red, moderate amber, low stays neutral.
const SEVERITY_TONE = { critical: 'critical', high: 'critical', moderate: 'warning', low: 'neutral' };
const SEVERITY_LABEL = { critical: 'Critical', high: 'High', moderate: 'Moderate', low: 'Low' };

const CASUALTIES = {
    none: 'None known',
    minor: 'Minor injuries',
    serious: 'Serious injuries',
    fatalities: 'Fatalities reported',
};

const NEEDS = [
    { key: 'rescue', icon: '🚒', label: 'Rescue', tone: 'critical' },
    { key: 'medical', icon: '🚑', label: 'Medical', tone: 'critical' },
    { key: 'evacuation', icon: '🚸', label: 'Evacuation', tone: 'critical' },
    { key: 'shelter', icon: '🏠', label: 'Shelter', tone: 'warning' },
    { key: 'food', icon: '🍞', label: 'Food', tone: 'warning' },
    { key: 'water', icon: '💧', label: 'Water', tone: 'info' },
];

function DisasterReportDetail({ role: propRole }) {
    const { id } = useParams();
    const location = useLocation();
    const { disasters, markResolvedByResponder, subscribeToDisasters, isInitialized } = useDisasterStore();

    useEffect(() => {
        if (!isInitialized) subscribeToDisasters();
    }, [isInitialized, subscribeToDisasters]);

    const role = propRole ||
        location.state?.role ||
        (location.pathname.startsWith('/disasters-list') ? 'responder' : 'reporter');

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [resolvedBy, setResolvedBy] = useState('');
    const [responderNotes, setResponderNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const disaster = disasters.find(d => d.id === id || d.id === parseInt(id));

    // Handle both snake_case (from Supabase) and camelCase (legacy)
    const disasterType = disaster?.disaster_type || disaster?.disasterType;
    const peopleAffected = disaster?.people_affected || disaster?.peopleAffected;
    const areaSize = disaster?.area_size || disaster?.areaSize;
    const reporterName = disaster?.reporter_name || disaster?.reporterName;
    const contactNumber = disaster?.contact_number || disaster?.contactNumber;
    const reportedAt = disaster?.created_at || disaster?.reportedAt;
    const occurredDate = disaster?.occurred_date || disaster?.occurredDate;
    const resolvedAtDate = disaster?.resolved_at || disaster?.resolvedAt;
    const resolvedByPerson = disaster?.resolved_by || disaster?.resolvedBy;
    const responderNotesData = disaster?.responder_notes || disaster?.responderNotes;

    const { weather, loading: weatherLoading } = useWeather(disaster?.location?.lat, disaster?.location?.lng);

    if (!isInitialized) return <DetailLoading label="Loading incident record…" />;

    if (!disaster) {
        return <DetailNotFound title="Report not found" message="This disaster report could not be located. It may have been removed." />;
    }

    const confirmMarkResolved = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await markResolvedByResponder(disaster.id, resolvedBy || 'Disaster Response Team', responderNotes || null);
            setShowConfirmDialog(false);
        } catch (error) {
            console.error('Error marking disaster as resolved:', error);
            alert('Failed to mark disaster as resolved. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isActive = disaster.status === 'Active';
    const canMarkResolved = role === 'responder' && isActive;
    const severity = disaster.severity || 'low';
    const activeNeeds = NEEDS.filter(n => disaster.needs?.[n.key]);
    const typeLabel = (disasterType || 'Unknown').replace('-', ' ');

    return (
        <DetailShell>
            <DetailHeader
                icon={IconSiren}
                iconTone={SEVERITY_TONE[severity] || 'neutral'}
                title={<span className="capitalize">{typeLabel}</span>}
                chips={
                    <>
                        <StatusChip tone={SEVERITY_TONE[severity] || 'neutral'}>{SEVERITY_LABEL[severity] || severity}</StatusChip>
                        <StatusChip tone={isActive ? 'warning' : 'success'}>{isActive ? 'Active' : 'Resolved'}</StatusChip>
                    </>
                }
                subtitle={`Report #${String(disaster.id).slice(0, 8)}`}
                meta={
                    <>
                        <MetaDot />
                        <span>Submitted {formatDateTime(reportedAt)}</span>
                        <MetaDot />
                        <span>{timeSince(reportedAt)}</span>
                        {disaster.location?.address && (
                            <>
                                <MetaDot />
                                <span className="inline-flex items-center gap-1 truncate">
                                    <IconMapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{disaster.location.address}</span>
                                </span>
                            </>
                        )}
                    </>
                }
                actions={canMarkResolved && (
                    <Button variant="primary" icon={IconCheck} onClick={() => setShowConfirmDialog(true)}>
                        Mark Resolved
                    </Button>
                )}
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                {/* Left ~65% — assessment: what happened, what is needed, who reported it */}
                <div className="flex flex-col gap-3 lg:col-span-8">
                    <InfoCard title="Incident Summary" icon={IconClipboardList}>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <MetricCard label="People Affected" value={peopleAffected || '—'} icon={IconUsers} />
                            <MetricCard
                                label="Casualties"
                                value={CASUALTIES[disaster.casualties] || disaster.casualties || '—'}
                                tone={disaster.casualties === 'fatalities' || disaster.casualties === 'serious' ? 'critical' : undefined}
                            />
                            <MetricCard label="Area Affected" value={areaSize || '—'} />
                            <MetricCard label="Occurred" value={occurredDate ? formatDateTime(occurredDate) : '—'} icon={IconClock} />
                        </div>

                        {activeNeeds.length > 0 && (
                            <div className="mt-3 border-t border-slate-200 pt-2.5 dark:border-white/10">
                                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Immediate needs</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {activeNeeds.map(n => (
                                        <Chip key={n.key} tone={n.tone} icon={n.icon}>{n.label}</Chip>
                                    ))}
                                </div>
                            </div>
                        )}
                    </InfoCard>

                    <InfoCard title="Description" icon={IconFileText}>
                        <p className="max-w-[75ch] text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                            {disaster.description || 'No description provided.'}
                        </p>
                    </InfoCard>

                    <WeatherCard weather={weather} loading={weatherLoading} />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoCard title="Timeline" icon={IconCalendar}>
                            <Timeline>
                                <TimelineItem
                                    tone="info"
                                    label="Report submitted"
                                    time={formatTime(reportedAt)}
                                    detail={`${formatDateTime(reportedAt)} · ${reporterName || 'Anonymous'}`}
                                    last={!resolvedAtDate}
                                />
                                {resolvedAtDate && (
                                    <TimelineItem
                                        tone="success"
                                        label="Resolved"
                                        time={formatTime(resolvedAtDate)}
                                        detail={`${formatDateTime(resolvedAtDate)} · ${resolvedByPerson || 'Response team'}${responderNotesData ? ` — ${responderNotesData}` : ''}`}
                                        last
                                    />
                                )}
                            </Timeline>
                        </InfoCard>

                        <InfoCard title="Reporter Information" icon={IconPhone}>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <KeyValueRow label="Reporter" value={reporterName} />
                                <KeyValueRow label="Phone" value={contactNumber} href={contactNumber ? `tel:${contactNumber}` : undefined} />
                                <KeyValueRow label="Submitted" value={timeSince(reportedAt)} />
                                <KeyValueRow label="Status" value={isActive ? 'Awaiting response' : 'Closed'} />
                            </dl>
                        </InfoCard>
                    </div>
                </div>

                {/* Right ~35% — evidence, then the map. Weather sits in the left
                    column so this stack stays short enough to clear the fold. */}
                <div className="flex flex-col gap-3 lg:col-span-4">
                    <PhotoCard src={disaster.photo} alt={`${typeLabel} report photo`} icon={IconCamera} />
                    <LocationCard
                        lat={disaster.location?.lat}
                        lng={disaster.location?.lng}
                        label={typeLabel}
                        address={disaster.location?.address}
                    >
                        <KeyValueRow label="Address" value={disaster.location?.address} />
                    </LocationCard>
                </div>
            </div>

            {showConfirmDialog && (
                <ConfirmDialog
                    title="Confirm resolution"
                    description="This marks the incident as resolved and stops it appearing in active response queues."
                    confirmLabel="Mark Resolved"
                    submitting={isSubmitting}
                    onCancel={() => setShowConfirmDialog(false)}
                    onConfirm={confirmMarkResolved}
                >
                    <Field label="Resolved by">
                        <input type="text" value={resolvedBy} onChange={e => setResolvedBy(e.target.value)} placeholder="Team or organisation name" className={INPUT} />
                    </Field>
                    <Field label="Notes (optional)">
                        <textarea value={responderNotes} onChange={e => setResponderNotes(e.target.value)} placeholder="Resolution details…" rows="3" className={INPUT} />
                    </Field>
                </ConfirmDialog>
            )}
        </DetailShell>
    );
}

export default DisasterReportDetail;
