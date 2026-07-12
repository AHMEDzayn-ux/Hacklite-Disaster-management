import React, { useState } from 'react';
import { IconPhone, IconShieldCheck } from '../components/icons/Icons';

function EmergencyContacts() {
    const [expandedDistrict, setExpandedDistrict] = useState(null);

    const nationalHotlines = [
        { name: 'DMC', number: '117', type: 'emergency' },
        { name: 'Police', number: '119', type: 'emergency' },
        { name: 'Ambulance', number: '1990', type: 'emergency' },
        { name: 'Fire & Rescue', number: '110', type: 'emergency' },
        { name: 'Army HQ', number: '113', type: 'military' },
        { name: 'Air Force HQ', number: '116', type: 'military' },
        { name: 'Navy HQ', number: '011 244 5368', type: 'military' },
        { name: 'NBRO (Landslide)', number: '011 258 8946', type: 'specialist' },
        { name: 'Meteorology', number: '011 268 6686', type: 'specialist' },
    ];

    const districtContacts = [
        { district: 'Ampara', officer: 'M.A.C.M. Riyas', mobile: '+94 77 395 7883', office: '+94 63 222 2218' },
        { district: 'Anuradhapura', officer: 'Lt Col SMDM Samarakoon', mobile: '+94 77 395 7881', office: '+94 25 223 4817' },
        { district: 'Badulla', officer: 'E.M.L.U. Kumara', mobile: '+94 77 395 7880', office: '+94 55 222 4751' },
        { district: 'Batticaloa', officer: 'A.S.M. Ziyath', mobile: '+94 77 395 7885', office: '+94 65 222 7701' },
        { district: 'Colombo', officer: 'Wing Comm. G P Dissanayaka', mobile: '+94 77 395 7870', office: '+94 11 243 4028' },
        { district: 'Galle', officer: 'Lt Col JNP Liyanagama', mobile: '+94 77 395 7873', office: '+94 91 222 7315' },
        { district: 'Gampaha', officer: 'A.M.A.N. Chandrasiri', mobile: '+94 77 395 7871', office: '+94 33 223 4671' },
        { district: 'Hambantota', officer: 'Sqn Ldr KA Kumara', mobile: '+94 77 395 7875', office: '+94 47 225 6463' },
        { district: 'Jaffna', officer: 'N. Sooriyarajah', mobile: '+94 77 395 7894', office: '+94 21 222 1676' },
        { district: 'Kalutara', officer: 'Lt Col T V N De Saa', mobile: '+94 77 395 7872', office: '+94 34 222 2912' },
        { district: 'Kandy', officer: 'I.A.K. Ranaweera', mobile: '+94 77 395 7878', office: '+94 81 220 2697' },
        { district: 'Kegalle', officer: 'K.A.D.K.S.D. Bandara', mobile: '+94 77 395 7876', office: '+94 35 222 2603' },
        { district: 'Kilinochchi', officer: 'A.M.R.M.K. Alahakoon', mobile: '+94 77 232 0528', office: '+94 21 228 5330' },
        { district: 'Kurunegala', officer: 'Anura Viraj Dissanayake', mobile: '+94 77 395 7887', office: '+94 37 222 1709' },
        { district: 'Mannar', officer: 'K. Thileepan', mobile: '+94 77 232 0529', office: '+94 23 225 0133' },
        { district: 'Matale', officer: 'Chaminda Amaraweera', mobile: '+94 77 395 7890', office: '+94 66 223 0926' },
        { district: 'Matara', officer: 'Lt. Col. K.G.C.K. Kudagamage', mobile: '+94 77 395 7874', office: '+94 41 223 4134' },
        { district: 'Monaragala', officer: 'A.H. Ravindra Kumara', mobile: '+94 77 395 7889', office: '+94 55 227 6867' },
        { district: 'Mullaitivu', officer: 'S. Kokularajah', mobile: '+94 77 395 7886', office: '+94 21 229 0054' },
        { district: 'Nuwara Eliya', officer: 'Lt Col H B M B N Bandra', mobile: '+94 77 395 7879', office: '+94 52 222 2113' },
        { district: 'Polonnaruwa', officer: 'Lt Col AJS Abenayaka', mobile: '+94 77 395 7882', office: '+94 27 222 6676' },
        { district: 'Puttalam', officer: 'Wing Comm. W.M.D.T. Bandara', mobile: '+94 77 395 7888', office: '+94 32 226 5756' },
        { district: 'Ratnapura', officer: 'S.H.M. Manjula', mobile: '+94 77 395 7877', office: '+94 45 222 2991' },
        { district: 'Trincomalee', officer: 'K. Sugunathas', mobile: '+94 77 395 7884', office: '+94 26 222 4711' },
        { district: 'Vavuniya', officer: 'Ruwan Rathnayake', mobile: '+94 77 395 7892', office: '+94 24 222 5553' },
    ];

    const toggleDistrict = (district) => {
        setExpandedDistrict(expandedDistrict === district ? null : district);
    };

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 font-sans sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1600px]">
                <div className="mb-8 flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-success-500 text-white shadow-lg shadow-success-500/30">
                        <IconPhone className="h-7 w-7" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Emergency Contacts</h1>
                </div>

                {/* National Hotlines */}
                <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md">
                    <h2 className="mb-4 text-lg font-bold text-white">National Emergency Hotlines</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {nationalHotlines.map((hotline, index) => {
                            const color = hotline.type === 'emergency' ? 'danger' : hotline.type === 'military' ? 'primary' : 'success';
                            return (
                                <a
                                    key={index}
                                    href={`tel:${hotline.number}`}
                                    className={`block rounded-xl border-l-4 bg-white/5 py-2.5 pl-3 pr-2 transition-colors hover:bg-white/10 ${color === 'danger' ? 'border-danger-500' : color === 'primary' ? 'border-primary-500' : 'border-success-500'
                                        }`}
                                >
                                    <h3 className="text-xs font-semibold text-slate-300">{hotline.name}</h3>
                                    <p className={`text-lg font-bold whitespace-nowrap ${color === 'danger' ? 'text-danger-400' : color === 'primary' ? 'text-primary-300' : 'text-success-400'
                                        }`}>
                                        {hotline.number}
                                    </p>
                                </a>
                            );
                        })}
                    </div>
                </div>

                {/* District Contacts */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md">
                    <div className="mb-4 flex items-center gap-3">
                        <IconShieldCheck className="h-5 w-5 text-primary-300" />
                        <h2 className="text-lg font-bold text-white">District Disaster Management Centre Units</h2>
                    </div>
                    <p className="mb-4 text-sm text-slate-400">Click on your district to view contact details</p>

                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                        {districtContacts.map((contact, index) => (
                            <div key={index}>
                                <button
                                    onClick={() => toggleDistrict(contact.district)}
                                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${expandedDistrict === contact.district
                                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                        : 'bg-white/5 text-slate-200 hover:bg-white/10'
                                        }`}
                                >
                                    {contact.district}
                                </button>

                                {expandedDistrict === contact.district && (
                                    <div className="mt-2 rounded-xl border border-primary-400/20 bg-primary-500/10 p-3 text-sm">
                                        <p className="mb-2 font-semibold text-white">{contact.officer}</p>
                                        <div className="space-y-1">
                                            <a
                                                href={`tel:${contact.mobile}`}
                                                className="block font-medium text-success-400 hover:underline"
                                            >
                                                {contact.mobile}
                                            </a>
                                            <a
                                                href={`tel:${contact.office}`}
                                                className="block text-primary-300 hover:underline"
                                            >
                                                {contact.office}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmergencyContacts;
