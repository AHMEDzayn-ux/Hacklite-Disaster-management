import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAnimalRescueStore } from '@/store';
import {
    DetailShell, DetailHeader, DetailLoading, DetailNotFound, MetaDot,
    InfoCard, KeyValueRow, MetricCard, StatusChip,
    Timeline, TimelineItem, Button, ConfirmDialog, Field,
    PhotoCard, WeatherCard, LocationCard,
} from '@/components/detail/DetailKit';
import { INPUT, useWeather, formatDateTime, formatTime, timeSince } from '@/lib/detailKit';
import {
    IconPawPrint, IconCheck, IconFileText, IconClipboardList, IconFirstAid,
    IconPhone, IconCalendar, IconCamera, IconMapPin, IconClock, IconSiren,
} from '@/components/icons/Icons';

const CONDITION_TONE = { critical: 'critical', injured: 'warning', trapped: 'warning', sick: 'warning', healthy: 'success' };
const CONDITION_LABEL = { critical: 'Critical', injured: 'Injured', trapped: 'Trapped', sick: 'Sick', healthy: 'Healthy' };

function AnimalRescueDetail({ role: propRole }) {
    const { id } = useParams();
    const location = useLocation();
    const { animalRescues, markFoundByResponder, subscribeToAnimalRescues, isInitialized } = useAnimalRescueStore();

    useEffect(() => {
        if (!isInitialized) subscribeToAnimalRescues();
    }, [isInitialized, subscribeToAnimalRescues]);

    // Determine role from prop, URL path, or location state
    const role = propRole ||
        location.state?.role ||
        (location.pathname.startsWith('/animal-rescue-list') ? 'responder' : 'reporter');

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [foundContact, setFoundContact] = useState('');
    const [foundNotes, setFoundNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const rescue = animalRescues.find(r => r.id === id || r.id === parseInt(id));

    // Handle both snake_case (database) and camelCase (legacy) field names
    const animalType = rescue?.animal_type || rescue?.animalType;
    const reporterName = rescue?.reporter_name || rescue?.reporterName;
    const contactNumber = rescue?.contact_number || rescue?.contactNumber;
    const reportedAt = rescue?.reported_at || rescue?.reportedAt || rescue?.created_at;
    const spottedDate = rescue?.spotted_date || rescue?.spottedDate;
    const foundAt = rescue?.found_at || rescue?.foundAt;
    const foundByContact = rescue?.found_by_contact || rescue?.foundByContact;
    const isDangerous = rescue?.is_dangerous || rescue?.isDangerous;
    const dangerDetails = rescue?.danger_details || rescue?.dangerDetails;
    const healthDetails = rescue?.health_details || rescue?.healthDetails;
    const status = rescue?.status || (foundAt ? 'Resolved' : 'Active');

    const { weather, loading: weatherLoading } = useWeather(rescue?.location?.lat, rescue?.location?.lng);

    if (!isInitialized) return <DetailLoading label="Loading rescue record…" />;

    if (!rescue) {
        return <DetailNotFound title="Rescue report not found" message="This animal rescue record could not be located. It may have been removed." />;
    }

    const confirmMarkRescued = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await markFoundByResponder(rescue.id, foundContact || null, foundNotes || null);
            setShowConfirmDialog(false);
            setFoundContact('');
            setFoundNotes('');
        } catch (error) {
            console.error('Error marking animal as rescued:', error);
            alert('Failed to mark animal as rescued. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isActive = status === 'Active';
    const canMarkRescued = role === 'responder' && isActive;
    const condition = rescue.condition;
    const conditionTone = CONDITION_TONE[condition] || 'neutral';
    const typeLabel = (animalType || 'Unknown').replace('-', ' ');

    return (
        <DetailShell>
            <DetailHeader
                icon={IconPawPrint}
                iconTone={isActive ? conditionTone : 'success'}
                title={<span className="capitalize">{typeLabel}{rescue.breed ? ` · ${rescue.breed}` : ''}</span>}
                chips={
                    <>
                        {condition && <StatusChip tone={conditionTone}>{CONDITION_LABEL[condition] || condition}</StatusChip>}
                        <StatusChip tone={isActive ? 'warning' : 'success'}>{isActive ? 'Pending' : 'Rescued'}</StatusChip>
                        {isDangerous && <StatusChip tone="critical">Dangerous</StatusChip>}
                    </>
                }
                subtitle={`Report #${String(rescue.id).slice(0, 8)}`}
                meta={
                    <>
                        <MetaDot />
                        <span>Reported {formatDateTime(reportedAt)}</span>
                        {rescue.location?.address && (
                            <>
                                <MetaDot />
                                <span className="inline-flex items-center gap-1 truncate">
                                    <IconMapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{rescue.location.address}</span>
                                </span>
                            </>
                        )}
                    </>
                }
                actions={canMarkRescued && (
                    <Button variant="primary" icon={IconCheck} onClick={() => setShowConfirmDialog(true)}>
                        Mark Rescued
                    </Button>
                )}
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                {/* Left ~65% — handler safety first, then condition and history */}
                <div className="flex flex-col gap-3 lg:col-span-8">
                    {isDangerous && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 dark:border-danger-500/30 dark:bg-danger-500/10"
                        >
                            <IconSiren className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger-600 dark:text-danger-400" />
                            <p className="text-[13px] leading-snug text-danger-800 dark:text-danger-200">
                                <span className="font-semibold">Dangerous animal — approach with caution.</span>{' '}
                                {dangerDetails || 'No further handling detail was provided by the reporter.'}
                            </p>
                        </div>
                    )}

                    <InfoCard title="Rescue Summary" icon={IconClipboardList}>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <MetricCard label="Animal" value={<span className="capitalize">{typeLabel}</span>} icon={IconPawPrint} />
                            <MetricCard
                                label="Condition"
                                value={CONDITION_LABEL[condition] || condition || '—'}
                                tone={conditionTone === 'neutral' ? undefined : conditionTone}
                            />
                            <MetricCard label="Spotted" value={spottedDate ? timeSince(spottedDate) : '—'} icon={IconClock} />
                            <MetricCard label="Access" value={rescue.accessibility ? <span className="capitalize">{rescue.accessibility}</span> : '—'} />
                        </div>
                    </InfoCard>

                    <InfoCard title="Description" icon={IconFileText}>
                        <p className="max-w-[75ch] text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                            {rescue.description || 'No description provided.'}
                        </p>
                    </InfoCard>

                    {healthDetails && (
                        <InfoCard title="Health Details" icon={IconFirstAid}>
                            <p className="max-w-[75ch] text-sm leading-relaxed text-slate-700 dark:text-slate-300">{healthDetails}</p>
                        </InfoCard>
                    )}

                    <WeatherCard weather={weather} loading={weatherLoading} />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoCard title="Timeline" icon={IconCalendar}>
                            <Timeline>
                                {spottedDate && (
                                    <TimelineItem
                                        tone="warning"
                                        label="Animal spotted"
                                        time={formatTime(spottedDate)}
                                        detail={formatDateTime(spottedDate)}
                                    />
                                )}
                                <TimelineItem
                                    tone="info"
                                    label="Report submitted"
                                    time={formatTime(reportedAt)}
                                    detail={`${formatDateTime(reportedAt)} · ${reporterName || 'Anonymous'}`}
                                    last={!foundAt}
                                />
                                {foundAt && (
                                    <TimelineItem
                                        tone="success"
                                        label="Animal rescued"
                                        time={formatTime(foundAt)}
                                        detail={formatDateTime(foundAt)}
                                        last
                                    />
                                )}
                            </Timeline>
                        </InfoCard>

                        <InfoCard title="Reporter Information" icon={IconPhone}>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <KeyValueRow label="Reporter" value={reporterName} />
                                <KeyValueRow label="Phone" value={contactNumber} href={contactNumber ? `tel:${contactNumber}` : undefined} />
                                <KeyValueRow label="Reported" value={timeSince(reportedAt)} />
                                {foundByContact
                                    ? <KeyValueRow label="Rescued by" value={foundByContact} />
                                    : <KeyValueRow label="Status" value={isActive ? 'Awaiting rescue' : 'Closed'} />}
                            </dl>
                        </InfoCard>
                    </div>
                </div>

                {/* Right ~35% — evidence, then the map. Weather sits in the left
                    column so this stack stays short enough to clear the fold. */}
                <div className="flex flex-col gap-3 lg:col-span-4">
                    <PhotoCard src={rescue.photo} alt={`${typeLabel} rescue photo`} icon={IconCamera} />
                    <LocationCard
                        title="Animal Location"
                        lat={rescue.location?.lat}
                        lng={rescue.location?.lng}
                        label={`${typeLabel} spotted here`}
                        address={rescue.location?.address}
                    >
                        <KeyValueRow label="Address" value={rescue.location?.address} />
                    </LocationCard>
                </div>
            </div>

            {showConfirmDialog && (
                <ConfirmDialog
                    title="Confirm rescue"
                    description="This closes the report and removes it from pending rescue queues."
                    confirmLabel="Mark Rescued"
                    submitting={isSubmitting}
                    onCancel={() => { setShowConfirmDialog(false); setFoundContact(''); setFoundNotes(''); }}
                    onConfirm={confirmMarkRescued}
                >
                    <Field label="Contact number (optional)">
                        <input type="tel" value={foundContact} onChange={e => setFoundContact(e.target.value)} placeholder="Your contact number" className={INPUT} />
                    </Field>
                    <Field label="Notes (optional)">
                        <textarea value={foundNotes} onChange={e => setFoundNotes(e.target.value)} placeholder="Details of the rescue…" rows="3" className={INPUT} />
                    </Field>
                </ConfirmDialog>
            )}
        </DetailShell>
    );
}

export default AnimalRescueDetail;
