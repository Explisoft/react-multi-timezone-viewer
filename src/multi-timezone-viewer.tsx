// MultiTimezoneViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { timeZonesNames } from '@vvo/tzdb';

interface Props {
    datetime: string;
    dateTimeZone: string;
    useCrossSiteStorage?: boolean;
    customStyles?: {
        container?: React.CSSProperties;
        tooltip?: React.CSSProperties;
        tooltipHeader?: React.CSSProperties;
        dialogOverlay?: React.CSSProperties;
        dialogBox?: React.CSSProperties;
        checkboxLabel?: React.CSSProperties;
        button?: React.CSSProperties;
    };
}

const STORAGE_KEY = 'multi_tz_zones';

const allTimezones = timeZonesNames
    .map((tz) => {
        const now = DateTime.now().setZone(tz);
        const offset = now.offset / 60;
        const sign = offset >= 0 ? '+' : '-';
        const offsetHours = Math.floor(Math.abs(offset));
        const offsetMinutes = Math.abs(now.offset % 60);
        return {
            label: `${tz} (UTC${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')})`,
            value: tz,
            offset,
        };
    })
    .sort((a, b) => a.offset - b.offset) // Sort by UTC offset
    .map(({ label, value }) => ({ label, value })); // Remove offset from final object


const getUserTimezones = (): string[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [Intl.DateTimeFormat().resolvedOptions().timeZone];
};

const setUserTimezones = (zones: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
};

const MultiTimezoneViewer: React.FC<Props> = ({
    datetime,
    dateTimeZone,
    useCrossSiteStorage = false,
    customStyles = {},
}) => {
    const baseTime = DateTime.fromFormat(datetime, 'yyyy-MM-dd HH:mm:ss', {
        zone: dateTimeZone,
    });
    const [timezones, setTimezones] = useState<string[]>([]);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const [showDialog, setShowDialog] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [hoveringText, setHoveringText] = useState(false);
    const [hoveringTooltip, setHoveringTooltip] = useState(false);

    useEffect(() => {
        if (!hoveringText && !hoveringTooltip) {
            const timeout = setTimeout(() => {
                setShowTooltip(false);
            }, 100); // slight delay helps avoid flicker
            return () => clearTimeout(timeout);
        }
    }, [hoveringText, hoveringTooltip]);

    useEffect(() => {
        if (useCrossSiteStorage) {
            window.addEventListener('message', (e) => {
                if (e.data?.type === 'RETURN_TIMEZONES') {
                    setTimezones(e.data.zones);
                }
            });

            const iframe = document.createElement('iframe');
            iframe.src = 'https://www.explisoft.com/npm/react-multi-timezone-viewer/script.html';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframeRef.current = iframe;

            iframe.onload = () => {
                iframe.contentWindow?.postMessage('GET_TIMEZONES', '*');
            };
        } else {
            setTimezones(getUserTimezones());
        }
    }, [useCrossSiteStorage]);

    const handleSave = (zones: string[]) => {
        setTimezones(zones);
        if (useCrossSiteStorage && iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage({ type: 'SET_TIMEZONES', zones }, '*');
        } else {
            setUserTimezones(zones);
        }
    };

    const handleMouseEnter = (e: React.MouseEvent) => {
        const spacing = 10;
        const tooltipWidth = 260;
        const tooltipHeight = 200;
        let left = e.clientX;
        let top = e.clientY;

        if (left + tooltipWidth > window.innerWidth) {
            left = window.innerWidth - tooltipWidth - spacing;
        }
        if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - spacing;
        }

        setTooltipPos({ top: top + window.scrollY + spacing, left: left + window.scrollX + spacing });
        setShowTooltip(true);
    };

    return (
        <>
            <span
                onMouseEnter={(e) => {
                    setHoveringText(true);
                    handleMouseEnter(e);
                }}
                onMouseLeave={() => setHoveringText(false)}
                style={{ display: 'inline', cursor: 'pointer', textDecoration: 'none', ...customStyles.container }}
            >
                {baseTime.toFormat('ff')}
            </span>

            {showTooltip && (
                <div
                    onMouseEnter={() => setHoveringTooltip(true)}
                    onMouseLeave={() => setHoveringTooltip(false)}
                    style={{
                        position: 'absolute',
                        top: tooltipPos.top,
                        left: tooltipPos.left,
                        background: '#fff',
                        border: '1px solid #ccc',
                        padding: '10px',
                        borderRadius: '4px',
                        zIndex: 1000,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        maxWidth: '400px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        textAlign: 'left',
                        ...customStyles.tooltip,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                            fontWeight: 'bold',
                            ...customStyles.tooltipHeader,
                        }}
                    >
                        <span>🕒 Timezones</span>
                        <span
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                setShowDialog(true);
                                setShowTooltip(false);
                            }}
                        >
                            ⚙️
                        </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {timezones.map((tz) => {
                                const time = baseTime.setZone(tz).toFormat('ff');
                                return (
                                    <tr key={tz}>
                                        <td style={{ padding: '4px 8px', verticalAlign: 'top', textAlign: 'left' }}>{tz}</td>
                                        <td style={{ padding: '4px 8px', verticalAlign: 'top', textAlign: 'left' }}>
                                            <strong>{time}</strong>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {useCrossSiteStorage && iframeRef.current && (
                        <div style={{ marginTop: '10px', fontSize: '11px', color: '#888', textAlign: 'right' }}>
                            Powered by <a href="https://www.explisoft.com" target="_blank" rel="noopener noreferrer">explisoft.com</a>
                        </div>
                    )}
                </div>
            )}

            {showDialog && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.3)',
                        zIndex: 100,
                        ...customStyles.dialogOverlay,
                    }}
                    onClick={() => setShowDialog(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            padding: '20px',
                            borderRadius: '8px',
                            width: '400px',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            margin: '5% auto',
                            textAlign: 'left',
                            position: 'relative',
                            ...customStyles.dialogBox,
                        }}
                    >
                        <span
                            onClick={() => setShowDialog(false)}
                            style={{ position: 'absolute', top: 10, right: 15, cursor: 'pointer' }}
                        >
                            ❌
                        </span>
                        <h3>Select Timezones</h3>
                        <div style={{ margin: '10px 0' }}>
                            {allTimezones.map((tz) => (
                                <label
                                    key={tz.value}
                                    style={{ display: 'block', marginBottom: '5px', fontSize: '14px', cursor: 'pointer', ...customStyles.checkboxLabel }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={timezones.includes(tz.value)}
                                        onChange={(e) => {
                                            const newZones = e.target.checked
                                                ? [...timezones, tz.value]
                                                : timezones.filter((z) => z !== tz.value);
                                            handleSave(newZones);
                                        }}
                                    />{' '}
                                    {tz.label}
                                </label>
                            ))}
                        </div>
                        {useCrossSiteStorage && iframeRef.current && (
                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#888', textAlign: 'right' }}>
                                Powered by <a href="https://www.explisoft.com" target="_blank" rel="noopener noreferrer">explisoft.com</a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default MultiTimezoneViewer;
