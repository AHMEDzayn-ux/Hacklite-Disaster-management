import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useMissingPersonStore } from '@/store';
import {
    DetailShell, DetailHeader, DetailLoading, DetailNotFound, MetaDot,
    InfoCard, KeyValueRow, MetricCard, StatusChip,
    Timeline, TimelineItem, Button, ConfirmDialog, Field,
    PhotoCard, WeatherCard, LocationCard,
} from '@/components/detail/DetailKit';
import { INPUT, useWeather, formatDateTime, formatTime, timeSince } from '@/lib/detailKit';
import {
    resolveMissingPersonCase, FOUND_CONDITIONS, FOUND_CONDITION_LABELS, CLOSURE_FIELD_LIMITS,
} from '@/features/missing-persons/services/missingPersonResolutionService';
import {
    IconUserSearch, IconCheck, IconUser, IconFileText, IconClipboardList,
    IconCalendar, IconCamera, IconMapPin, IconClock, IconInfo,
    IconShieldLock, IconShieldCheck, IconSiren, IconMessageSquare,
} from '@/components/icons/Icons';

// A search goes cold fast — elapsed time is the page's severity signal.
const elapsedTone = since => {
    if (since == null) return 'neutral';
    const hours = (Date.now() - new Date(since).getTime()) / 3600e3;
    if (isNaN(hours)) return 'neutral';
    if (hours >= 72) return 'critical';
    if (hours >= 24) return 'warning';
    return 'info';
};

const EMPTY_CLOSURE = {
    resolvedByName: '',
    resolverContact: '',
    foundPersonLocation: '',
    foundPersonCondition: 'safe',
    authorityContact: '',
    notes: '',
};

function MissingPersonDetail({ role: propRole }) {
    const { id } = useParams();
    const location = useLocation();
    const { missingPersons, applyCaseResolution, subscribeToMissingPersons, isInitialized } = useMissingPersonStore();

    useEffect(() => {
        if (!isInitialized) subscribeToMissingPersons();
    }, [isInitialized, subscribeToMissingPersons]);

    // Determine role from prop, URL path, or location state
    const role = propRole ||
        location.state?.role ||
        (location.pathname.startsWith('/missing-persons-list') ? 'responder' : 'reporter');

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [closure, setClosure] = useState(EMPTY_CLOSURE);
    const [closureError, setClosureError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notifyResult, setNotifyResult] = useState(null);

    const person = missingPersons.find(p => p.id === id || p.id === parseInt(id));

    // Handle both snake_case (database) and camelCase (legacy) field names
    const lastSeenLocation = person?.last_seen_location || person?.lastSeenLocation;
    const lastSeenDate = person?.last_seen_date || person?.lastSeenDate;
    const reportedAt = person?.reported_at || person?.reportedAt || person?.created_at;
    const foundAt = person?.found_at || person?.foundAt;
    const status = person?.status || (foundAt ? 'Resolved' : 'Active');

    // Closure record. The reporter's name and phone number are deliberately not
    // read on this page at all — see the Reporter Contact card below.
    const resolvedByName = person?.resolved_by_name;
    const foundPersonLocation = person?.found_person_location;
    const foundPersonCondition = person?.found_person_condition;
    const authorityContact = person?.authority_contact;
    const foundNotes = person?.found_notes;
    const notificationStatus = person?.reporter_notification_status;

    const { weather, loading: weatherLoading } = useWeather(lastSeenLocation?.lat, lastSeenLocation?.lng);

    if (!isInitialized) return <DetailLoading label="Loading case record…" />;

    if (!person) {
        return <DetailNotFound title="Case not found" message="This missing person record could not be located. It may have been removed." />;
    }

    const setField = (key, value) => setClosure(prev => ({ ...prev, [key]: value }));

    const resetDialog = () => {
        setShowConfirmDialog(false);
        setClosure(EMPTY_CLOSURE);
        setClosureError(null);
    };

    const confirmMarkFound = async () => {
        if (isSubmitting) return;
        setClosureError(null);

        if (closure.resolvedByName.trim().length < 2) {
            setClosureError({ error: 'Enter your name — the reporter is told who closed the case.' });
            return;
        }
        if (closure.foundPersonLocation.trim().length < 3) {
            setClosureError({ error: 'Enter where the person is now. This is the update the reporter needs most.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await resolveMissingPersonCase({ caseId: person.id, ...closure });

            if (!result.success) {
                setClosureError(result);
                return;
            }

            applyCaseResolution(person.id, {
                found_at: result.foundAt,
                // 'not_sent' collapses the server's failed/no_recipient/not_configured
                // cases; realtime replaces it with the exact status moments later.
                reporter_notification_status: result.notified ? 'sent' : 'not_sent',
                ...(result.resolution || {}),
            });
            setNotifyResult(result.notified ? 'sent' : 'not_sent');
            resetDialog();
        } catch (error) {
            console.error('Error closing missing person case:', error);
            setClosureError({ error: 'Could not close the case. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isActive = status === 'Active';
    const canMarkFound = role === 'responder' && isActive;
    const missingSince = lastSeenDate || reportedAt;
    const urgency = isActive ? elapsedTone(missingSince) : 'success';
    const counter = key => `${closure[key].length}/${CLOSURE_FIELD_LIMITS[key]}`;

    return (
        <DetailShell>
            <DetailHeader
                icon={IconUserSearch}
                iconTone={urgency}
                title={person.name || 'Unnamed person'}
                chips={
                    <>
                        <StatusChip tone={isActive ? 'warning' : 'success'}>{isActive ? 'Searching' : 'Found'}</StatusChip>
                        {isActive && missingSince && (
                            <StatusChip tone={urgency}>Missing {timeSince(missingSince).replace(' ago', '')}</StatusChip>
                        )}
                    </>
                }
                subtitle={`Case #${String(person.id).slice(0, 8)}`}
                meta={
                    <>
                        <MetaDot />
                        <span>Reported {formatDateTime(reportedAt)}</span>
                        {lastSeenLocation?.address && (
                            <>
                                <MetaDot />
                                <span className="inline-flex items-center gap-1 truncate">
                                    <IconMapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">Last seen: {lastSeenLocation.address}</span>
                                </span>
                            </>
                        )}
                    </>
                }
                actions={canMarkFound && (
                    <Button variant="primary" icon={IconCheck} onClick={() => setShowConfirmDialog(true)}>
                        Mark Found
                    </Button>
                )}
            />

            {notifyResult && (
                <div
                    role="status"
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${notifyResult === 'sent'
                        ? 'border-success-200 bg-success-50 dark:border-success-500/30 dark:bg-success-500/10'
                        : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'}`}
                >
                    <IconMessageSquare className={`mt-0.5 h-4 w-4 flex-shrink-0 ${notifyResult === 'sent'
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-amber-600 dark:text-amber-400'}`} />
                    <p className="text-[13px] leading-snug text-slate-700 dark:text-slate-200">
                        {notifyResult === 'sent'
                            ? 'Case closed. The reporter has been sent an automated SMS with these details, including a warning never to pay anyone over this case.'
                            : 'Case closed, but the automated SMS to the reporter could not be delivered. A coordinator will follow it up.'}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                {/* Left ~65% — identity, description and search history */}
                <div className="flex flex-col gap-3 lg:col-span-8">
                    <InfoCard title="Person Summary" icon={IconClipboardList}>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <MetricCard label="Age" value={person.age || '—'} icon={IconUser} />
                            <MetricCard label="Gender" value={person.gender ? <span className="capitalize">{person.gender}</span> : '—'} />
                            <MetricCard
                                label="Missing For"
                                value={missingSince ? timeSince(missingSince).replace(' ago', '') : '—'}
                                icon={IconClock}
                                tone={isActive ? urgency : undefined}
                            />
                            <MetricCard label="Last Seen" value={lastSeenDate ? formatDateTime(lastSeenDate) : '—'} icon={IconCalendar} />
                        </div>
                    </InfoCard>

                    <InfoCard title="Description" icon={IconFileText}>
                        <p className="max-w-[75ch] text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                            {person.description || 'No description provided.'}
                        </p>
                    </InfoCard>

                    {person.additionalInfo && (
                        <InfoCard title="Additional Information" icon={IconInfo}>
                            <p className="max-w-[75ch] text-sm leading-relaxed text-slate-700 dark:text-slate-300">{person.additionalInfo}</p>
                        </InfoCard>
                    )}

                    {!isActive && (
                        <InfoCard title="Case Closure" icon={IconShieldCheck}>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                                <KeyValueRow label="Closed by" value={resolvedByName} />
                                <KeyValueRow label="Condition" value={FOUND_CONDITION_LABELS[foundPersonCondition] || foundPersonCondition} />
                                <KeyValueRow label="Where the person is now" value={foundPersonLocation} />
                                <KeyValueRow label="Verify with" value={authorityContact} />
                                <KeyValueRow label="Closed at" value={foundAt ? formatDateTime(foundAt) : undefined} />
                                <KeyValueRow
                                    label="Reporter notified"
                                    value={notificationStatus === 'sent'
                                        ? 'Yes — automated SMS'
                                        : notificationStatus ? 'SMS not delivered' : undefined}
                                />
                            </dl>
                            {foundNotes && (
                                <p className="mt-3 max-w-[75ch] border-t border-slate-200 pt-3 text-sm leading-relaxed text-slate-700 dark:border-white/10 dark:text-slate-300">
                                    {foundNotes}
                                </p>
                            )}
                            <p className="mt-3 text-xs leading-snug text-slate-500 dark:text-slate-400">
                                Submitted by a member of the public and not independently verified. Nobody connected to this case
                                will ever ask for a payment.
                            </p>
                        </InfoCard>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoCard title="Timeline" icon={IconCalendar}>
                            <Timeline>
                                {lastSeenDate && (
                                    <TimelineItem
                                        tone={urgency === 'success' ? 'neutral' : urgency}
                                        label="Last seen"
                                        time={formatTime(lastSeenDate)}
                                        detail={`${formatDateTime(lastSeenDate)}${lastSeenLocation?.address ? ` · ${lastSeenLocation.address}` : ''}`}
                                    />
                                )}
                                <TimelineItem
                                    tone="info"
                                    label="Case reported"
                                    time={formatTime(reportedAt)}
                                    detail={formatDateTime(reportedAt)}
                                    last={!foundAt}
                                />
                                {foundAt && (
                                    <TimelineItem
                                        tone="success"
                                        label="Person found"
                                        time={formatTime(foundAt)}
                                        detail={resolvedByName ? `${formatDateTime(foundAt)} · closed by ${resolvedByName}` : formatDateTime(foundAt)}
                                        last
                                    />
                                )}
                            </Timeline>
                        </InfoCard>

                        {/*
                          The reporter's name and number are withheld here on purpose. Anyone
                          can open a case record, and "I found your daughter, call me and we
                          will discuss" is a known extortion opening — so the reporter is only
                          ever reached by the platform's own automated SMS, never by a stranger
                          dialling them directly. Administrators see the real details in the
                          records console.
                        */}
                        <InfoCard title="Reporter Contact" icon={IconShieldLock}>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <KeyValueRow label="Reporter" value="Withheld" />
                                <KeyValueRow label="Phone" value="Withheld" />
                                <KeyValueRow label="Reported" value={timeSince(reportedAt)} />
                                <KeyValueRow label="Case status" value={isActive ? 'Search active' : 'Closed'} />
                            </dl>
                            <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-snug text-slate-500 dark:border-white/10 dark:text-slate-400">
                                Visible to administrators only. Closing this case notifies the reporter automatically by SMS with
                                the closure details, so there is never a need to contact them privately — and never a reason for
                                money to change hands.
                            </p>
                        </InfoCard>
                    </div>
                </div>

                {/* Right ~35% — photo, conditions at the search area, last-seen map */}
                <div className="flex flex-col gap-3 lg:col-span-4">
                    <PhotoCard src={person.photo} alt={person.name} title="Photograph" icon={IconCamera} />
                    <WeatherCard weather={weather} loading={weatherLoading} title="Weather at Last Seen" />
                    <LocationCard
                        title="Last Seen Location"
                        lat={lastSeenLocation?.lat}
                        lng={lastSeenLocation?.lng}
                        label="Last seen here"
                        address={lastSeenLocation?.address}
                    >
                        <KeyValueRow label="Address" value={lastSeenLocation?.address} />
                    </LocationCard>
                </div>
            </div>

            {showConfirmDialog && (
                <ConfirmDialog
                    wide
                    title="Close case — person found"
                    description="These details go to the reporter as an automated SMS. Fill them in as precisely as you can: this may be the first news the family gets."
                    confirmLabel="Close Case & Notify"
                    submitting={isSubmitting}
                    onCancel={resetDialog}
                    onConfirm={confirmMarkFound}
                >
                    <div role="note" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <IconSiren className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-[13px] leading-snug text-amber-900 dark:text-amber-200">
                            <span className="font-semibold">Never request money and never leave a personal number.</span>{' '}
                            Nobody is paid for reporting a person found. Text that asks for payment or adds a private contact route
                            is rejected and sent to a coordinator for review, and the case stays open.
                        </p>
                    </div>

                    <Field label="Your name (required)">
                        <input
                            type="text"
                            value={closure.resolvedByName}
                            onChange={e => setField('resolvedByName', e.target.value)}
                            maxLength={CLOSURE_FIELD_LIMITS.resolvedByName}
                            placeholder="The name the reporter will see"
                            className={INPUT}
                        />
                    </Field>

                    <Field label="Where is the person now? (required)">
                        <input
                            type="text"
                            value={closure.foundPersonLocation}
                            onChange={e => setField('foundPersonLocation', e.target.value)}
                            maxLength={CLOSURE_FIELD_LIMITS.foundPersonLocation}
                            placeholder="e.g. Teaching Hospital Kandy, ward 4"
                            className={INPUT}
                        />
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            Name the place, not a person. {counter('foundPersonLocation')}
                        </span>
                    </Field>

                    <Field label="Condition (required)">
                        <select
                            value={closure.foundPersonCondition}
                            onChange={e => setField('foundPersonCondition', e.target.value)}
                            className={INPUT}
                        >
                            {FOUND_CONDITIONS.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Official contact to verify with (optional)">
                        <input
                            type="text"
                            value={closure.authorityContact}
                            onChange={e => setField('authorityContact', e.target.value)}
                            maxLength={CLOSURE_FIELD_LIMITS.authorityContact}
                            placeholder="e.g. Kandy Police Station, 081-2222222"
                            className={INPUT}
                        />
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            An official desk and its published hotline only — personal mobile numbers are rejected.
                        </span>
                    </Field>

                    <Field label="Additional notes (optional)">
                        <textarea
                            value={closure.notes}
                            onChange={e => setField('notes', e.target.value)}
                            maxLength={CLOSURE_FIELD_LIMITS.notes}
                            placeholder="How the person was found, who is with them now, what happens next…"
                            rows="3"
                            className={INPUT}
                        />
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            Sent to the reporter word for word. No phone numbers, links or payment requests. {counter('notes')}
                        </span>
                    </Field>

                    <Field label="Your contact number (optional, never shared with the reporter)">
                        <input
                            type="tel"
                            value={closure.resolverContact}
                            onChange={e => setField('resolverContact', e.target.value)}
                            placeholder="Held for coordinators only"
                            className={INPUT}
                        />
                    </Field>

                    {closureError && (
                        <div role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 dark:border-danger-500/30 dark:bg-danger-500/10">
                            <p className="text-[13px] font-semibold text-danger-800 dark:text-danger-200">{closureError.error}</p>
                            {closureError.guidance?.length > 0 && (
                                <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-snug text-danger-800 dark:text-danger-200">
                                    {closureError.guidance.map((line, idx) => <li key={idx}>{line}</li>)}
                                </ul>
                            )}
                            {closureError.review && (
                                <p className="mt-1 text-xs text-danger-700 dark:text-danger-300">{closureError.review}</p>
                            )}
                        </div>
                    )}
                </ConfirmDialog>
            )}
        </DetailShell>
    );
}

export default MissingPersonDetail;
