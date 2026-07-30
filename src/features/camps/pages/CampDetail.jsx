import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCampStore } from '@/store';
import {
    DetailShell, DetailHeader, DetailLoading, DetailNotFound, MetaDot,
    InfoCard, KeyValueRow, MetricCard, StatusChip, Chip,
    Timeline, TimelineItem, Button, ConfirmDialog, Field, LocationCard,
} from '@/components/detail/DetailKit';
import { INPUT, formatDateTime, formatTime } from '@/lib/detailKit';
import {
    IconTent, IconUsers, IconPackage, IconGrid, IconPhone, IconCalendar,
    IconClipboardList, IconMapPin, IconInfo, IconCheck, IconX,
} from '@/components/icons/Icons';

const CAMP_TYPE_LABEL = {
    'temporary-shelter': 'Temporary Shelter',
    'emergency-evacuation': 'Emergency Evacuation',
    'long-term-relief': 'Long-term Relief',
    'medical-facility': 'Medical Facility',
};

const STOCK_TONE = { adequate: 'success', low: 'warning', critical: 'critical', none: 'neutral' };
const STOCK_LABEL = { adequate: 'Adequate', low: 'Low', critical: 'Critical', none: 'None' };

const FACILITIES = {
    shelter: 'Shelter', food: 'Food', water: 'Water', medical: 'Medical',
    sanitation: 'Sanitation', electricity: 'Electricity', bedding: 'Bedding',
    communication: 'Communication', security: 'Security', transport: 'Transport',
};

function CampDetail() {
    const { id } = useParams();
    const { camps, updateOccupancy, subscribeToCamps, isInitialized } = useCampStore();

    useEffect(() => {
        if (!isInitialized) subscribeToCamps();
    }, [isInitialized, subscribeToCamps]);

    const [showOccupancyDialog, setShowOccupancyDialog] = useState(false);
    const [newOccupancy, setNewOccupancy] = useState('');

    const camp = camps.find(c => c.id === id || c.id === parseInt(id));

    if (!isInitialized) return <DetailLoading label="Loading camp record…" />;

    if (!camp) {
        return <DetailNotFound title="Camp not found" message="This relief camp record could not be located. It may have been removed." />;
    }

    const capacity = camp.capacity || camp.total_capacity || 0;
    const occupied = camp.current_occupancy || 0;
    const occupancyPercent = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
    const available = Math.max(capacity - occupied, 0);
    const occupancyTone = occupancyPercent >= 90 ? 'critical' : occupancyPercent >= 70 ? 'warning' : 'success';

    const lat = camp.latitude ?? camp.location?.lat;
    const lng = camp.longitude ?? camp.location?.lng;
    const address = camp.address || camp.location?.address;
    const campName = camp.name || camp.camp_name || 'Unnamed Camp';
    const supplies = camp.supplies && Object.keys(camp.supplies).length > 0 ? Object.entries(camp.supplies) : [];
    const needs = Array.isArray(camp.needs) ? camp.needs : [];

    const statusTone = camp.status === 'Active' ? 'success' : camp.status === 'Closed' ? 'neutral' : 'warning';

    const handleUpdateOccupancy = () => {
        if (newOccupancy !== '' && !isNaN(newOccupancy)) {
            updateOccupancy(camp.id, parseInt(newOccupancy));
            setShowOccupancyDialog(false);
            setNewOccupancy('');
        }
    };

    return (
        <DetailShell>
            <DetailHeader
                icon={IconTent}
                iconTone={statusTone}
                title={campName}
                chips={
                    <>
                        <StatusChip tone={statusTone}>{camp.status || 'Unknown'}</StatusChip>
                        <StatusChip tone={occupancyTone}>{occupancyPercent}% full</StatusChip>
                    </>
                }
                subtitle={CAMP_TYPE_LABEL[camp.type] || camp.type?.replace('-', ' ') || 'Relief camp'}
                meta={
                    <>
                        <MetaDot />
                        <span className="inline-flex items-center gap-1 truncate">
                            <IconMapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                                {camp.district || 'Unknown'} District{camp.ds_division ? ` · ${camp.ds_division} DS` : ''}
                            </span>
                        </span>
                        {camp.source && (
                            <>
                                <MetaDot />
                                <span>{camp.source === 'public_request' ? 'From public request' : 'Admin registered'}</span>
                            </>
                        )}
                    </>
                }
                actions={camp.status === 'Active' && (
                    <Button variant="primary" icon={IconUsers} onClick={() => setShowOccupancyDialog(true)}>
                        Update Occupancy
                    </Button>
                )}
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                {/* Left ~65% — capacity, needs, supplies, facilities */}
                <div className="flex flex-col gap-3 lg:col-span-8">
                    <InfoCard
                        title="Capacity & Occupancy"
                        icon={IconUsers}
                        right={<span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{occupied} / {capacity || '—'} people</span>}
                    >
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <MetricCard label="Total Capacity" value={capacity || '—'} />
                            <MetricCard label="Occupied" value={occupied} />
                            <MetricCard label="Available" value={capacity ? available : '—'} tone={available === 0 && capacity ? 'critical' : undefined} />
                            <MetricCard label="Utilisation" value={`${occupancyPercent}%`} tone={occupancyTone} />
                        </div>
                        <div
                            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
                            role="progressbar"
                            aria-valuenow={occupancyPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Camp occupancy"
                        >
                            <div
                                className={`h-full rounded-full ${occupancyPercent >= 90 ? 'bg-danger-500' : occupancyPercent >= 70 ? 'bg-amber-500' : 'bg-success-500'}`}
                                style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                            />
                        </div>
                    </InfoCard>

                    {needs.length > 0 && (
                        <InfoCard title="Urgent Needs" icon={IconClipboardList}>
                            <div className="flex flex-wrap gap-1.5">
                                {needs.map((need, i) => <Chip key={i} tone="warning">{need}</Chip>)}
                            </div>
                        </InfoCard>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoCard title="Supply Status" icon={IconPackage}>
                            {supplies.length > 0 ? (
                                <ul className="m-0 list-none divide-y divide-slate-200 p-0 dark:divide-white/10">
                                    {supplies.map(([key, supply]) => (
                                        <li key={key} className="flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0">
                                            <div className="min-w-0">
                                                <p className="truncate text-[13px] font-medium capitalize text-slate-800 dark:text-slate-200">{key}</p>
                                                {(supply?.quantity !== undefined || supply?.notes) && (
                                                    <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                                                        {supply?.quantity !== undefined && `Qty ${supply.quantity}`}
                                                        {supply?.quantity !== undefined && supply?.notes && ' · '}
                                                        {supply?.notes}
                                                    </p>
                                                )}
                                            </div>
                                            <StatusChip tone={STOCK_TONE[supply?.stock] || 'neutral'}>
                                                {STOCK_LABEL[supply?.stock] || 'Unknown'}
                                            </StatusChip>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="py-2 text-sm text-slate-500 dark:text-slate-400">No supply information recorded.</p>
                            )}
                        </InfoCard>

                        <InfoCard title="Facilities" icon={IconGrid}>
                            <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0">
                                {Object.entries(FACILITIES).map(([key, label]) => {
                                    const has = Boolean(camp.facilities?.[key]);
                                    return (
                                        <li key={key} className="flex items-center gap-1.5 text-[13px]">
                                            {has
                                                ? <IconCheck className="h-3.5 w-3.5 flex-shrink-0 text-success-600 dark:text-success-400" />
                                                : <IconX className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 dark:text-slate-600" />}
                                            <span className={has ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}>{label}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </InfoCard>
                    </div>

                    {(camp.special_needs || camp.notes || camp.additional_notes) && (
                        <InfoCard title="Notes & Accommodations" icon={IconInfo}>
                            {camp.special_needs && (
                                <div className="mb-2">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Special accommodations</p>
                                    <p className="mt-0.5 max-w-[75ch] text-sm leading-relaxed text-slate-700 dark:text-slate-300">{camp.special_needs}</p>
                                </div>
                            )}
                            {(camp.notes || camp.additional_notes) && (
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</p>
                                    <p className="mt-0.5 max-w-[75ch] whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{camp.notes || camp.additional_notes}</p>
                                </div>
                            )}
                        </InfoCard>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InfoCard title="Timeline" icon={IconCalendar}>
                            <Timeline>
                                <TimelineItem
                                    tone="info"
                                    label="Camp created"
                                    time={formatTime(camp.created_at || camp.openedDate)}
                                    detail={`${formatDateTime(camp.created_at || camp.openedDate)}${camp.disasterType ? ` · ${camp.disasterType}` : ''}`}
                                    last={!camp.updated_at && camp.status !== 'Closed'}
                                />
                                {camp.updated_at && camp.updated_at !== camp.created_at && (
                                    <TimelineItem
                                        tone="neutral"
                                        label="Last updated"
                                        time={formatTime(camp.updated_at)}
                                        detail={formatDateTime(camp.updated_at)}
                                        last={camp.status !== 'Closed' && !camp.closedDate}
                                    />
                                )}
                                {(camp.closedDate || camp.status === 'Closed') && (
                                    <TimelineItem
                                        tone="neutral"
                                        label="Camp closed"
                                        time={formatTime(camp.closedDate || camp.updated_at)}
                                        detail={formatDateTime(camp.closedDate || camp.updated_at)}
                                        last
                                    />
                                )}
                            </Timeline>
                        </InfoCard>

                        <InfoCard title="Contact Information" icon={IconPhone}>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <KeyValueRow label="Contact person" value={camp.contact_person || camp.managed_by} />
                                <KeyValueRow label="Phone" value={camp.contact_number} href={camp.contact_number ? `tel:${camp.contact_number}` : undefined} />
                                <KeyValueRow label="Email" value={camp.contact_email} href={camp.contact_email ? `mailto:${camp.contact_email}` : undefined} className="col-span-2" />
                            </dl>
                        </InfoCard>
                    </div>
                </div>

                {/* Right ~35% — where the camp is, and its registration record */}
                <div className="flex flex-col gap-3 lg:col-span-4">
                    <LocationCard lat={lat} lng={lng} label={campName} address={address}>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            <KeyValueRow label="Address" value={address} className="col-span-2" />
                            {camp.village_area && <KeyValueRow label="Village / area" value={camp.village_area} />}
                            {camp.nearby_landmark && <KeyValueRow label="Landmark" value={camp.nearby_landmark} />}
                            <KeyValueRow label="District" value={camp.district} />
                            {camp.ds_division && <KeyValueRow label="DS division" value={camp.ds_division} />}
                        </dl>
                    </LocationCard>

                    <InfoCard title="Camp Record" icon={IconClipboardList}>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <KeyValueRow label="Type" value={CAMP_TYPE_LABEL[camp.type] || camp.type?.replace('-', ' ')} capitalize />
                            <KeyValueRow label="Status" value={camp.status} />
                            <KeyValueRow label="Source" value={camp.source?.replace('_', ' ')} capitalize />
                            <KeyValueRow label="Disaster" value={camp.disasterType} />
                            <KeyValueRow label="Camp ID" value={camp.id} mono className="col-span-2" />
                            {camp.source_request_id && <KeyValueRow label="Request ID" value={camp.source_request_id} mono className="col-span-2" />}
                        </dl>
                    </InfoCard>
                </div>
            </div>

            {showOccupancyDialog && (
                <ConfirmDialog
                    title="Update occupancy"
                    description={`${campName} currently holds ${occupied} of ${capacity || 'an unrecorded number of'} places.`}
                    confirmLabel="Update"
                    onCancel={() => { setShowOccupancyDialog(false); setNewOccupancy(''); }}
                    onConfirm={handleUpdateOccupancy}
                >
                    <Field label="New occupancy">
                        <input
                            type="number"
                            value={newOccupancy}
                            onChange={e => setNewOccupancy(e.target.value)}
                            placeholder="Number of people currently in camp"
                            max={capacity || undefined}
                            min={0}
                            className={INPUT}
                        />
                    </Field>
                </ConfirmDialog>
            )}
        </DetailShell>
    );
}

export default CampDetail;
