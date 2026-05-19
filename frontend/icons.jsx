// === Icons — minimal stroke icons ===
const Icon = ({ name, size = 18, ...rest }) => {
  const paths = {
    home: <><path d="M3 11L12 4L21 11V20A1 1 0 0 1 20 21H4A1 1 0 0 1 3 20V11Z"/><path d="M9 21V13H15V21"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    edit: <><path d="M12 20H21"/><path d="M16.5 3.5A2.121 2.121 0 0 1 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"/></>,
    play: <path d="M6 4L20 12L6 20V4Z" strokeLinejoin="round"/>,
    bar: <><path d="M3 3V21H21"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="5" width="3" height="13"/></>,
    radio: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15A1.65 1.65 0 0 0 19.7 16.8L19.8 16.9A2 2 0 1 1 17 19.7L16.9 19.6A1.65 1.65 0 0 0 15.1 19.3 1.65 1.65 0 0 0 14 20.8V21A2 2 0 1 1 10 21V20.9A1.65 1.65 0 0 0 8.9 19.4 1.65 1.65 0 0 0 7.1 19.7L7 19.8A2 2 0 1 1 4.2 17L4.3 16.9A1.65 1.65 0 0 0 4.6 15.1 1.65 1.65 0 0 0 3.1 14H3A2 2 0 1 1 3 10H3.1A1.65 1.65 0 0 0 4.6 8.9 1.65 1.65 0 0 0 4.3 7.1L4.2 7A2 2 0 1 1 7 4.2L7.1 4.3A1.65 1.65 0 0 0 8.9 4.6H9A1.65 1.65 0 0 0 10 3.1V3A2 2 0 1 1 14 3V3.1A1.65 1.65 0 0 0 15.1 4.6 1.65 1.65 0 0 0 16.9 4.3L17 4.2A2 2 0 1 1 19.8 7L19.7 7.1A1.65 1.65 0 0 0 19.4 8.9V9A1.65 1.65 0 0 0 20.9 10H21A2 2 0 1 1 21 14H20.9A1.65 1.65 0 0 0 19.4 15Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21L16.65 16.65"/></>,
    plus: <><path d="M12 5V19"/><path d="M5 12H19"/></>,
    check: <path d="M5 12L10 17L20 7" strokeLinejoin="round"/>,
    x: <><path d="M18 6L6 18"/><path d="M6 6L18 18"/></>,
    chevronRight: <path d="M9 6L15 12L9 18" strokeLinejoin="round"/>,
    chevronDown: <path d="M6 9L12 15L18 9" strokeLinejoin="round"/>,
    chevronLeft: <path d="M15 6L9 12L15 18" strokeLinejoin="round"/>,
    arrowRight: <><path d="M5 12H19"/><path d="M13 6L19 12L13 18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7V12L15 14"/></>,
    users: <><path d="M17 21V19A4 4 0 0 0 13 15H5A4 4 0 0 0 1 19V21"/><circle cx="9" cy="7" r="4"/><path d="M23 21V19A4 4 0 0 0 20 15.13"/><path d="M16 3.13A4 4 0 0 1 16 11"/></>,
    user: <><path d="M20 21V19A4 4 0 0 0 16 15H8A4 4 0 0 0 4 19V21"/><circle cx="12" cy="7" r="4"/></>,
    eye: <><path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></>,
    trash: <><path d="M3 6H21"/><path d="M8 6V4A2 2 0 0 1 10 2H14A2 2 0 0 1 16 4V6"/><path d="M19 6L18 20A2 2 0 0 1 16 22H8A2 2 0 0 1 6 20L5 6"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4A2 2 0 0 1 2 13V4A2 2 0 0 1 4 2H13A2 2 0 0 1 15 4V5"/></>,
    sparkle: <><path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"/><path d="M19 4L19.7 6.3L22 7L19.7 7.7L19 10L18.3 7.7L16 7L18.3 6.3L19 4Z"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15L16 10L5 21"/></>,
    type: <><path d="M4 7V4H20V7"/><path d="M9 20H15"/><path d="M12 4V20"/></>,
    bolt: <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" strokeLinejoin="round"/>,
    qr: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14H17V17H14ZM18 18H21V21H18ZM14 18H17V21H14ZM18 14H21V17H18Z"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z"/><path d="M13.73 21A2 2 0 0 1 10.27 21"/></>,
    folder: <path d="M22 19A2 2 0 0 1 20 21H4A2 2 0 0 1 2 19V5A2 2 0 0 1 4 3H9L11 6H20A2 2 0 0 1 22 8Z"/>,
    chart: <><path d="M3 3V21H21"/><path d="M7 14L11 10L15 14L21 8"/></>,
    flag: <><path d="M4 15S5 14 8 14 13 16 16 16 20 15 20 15V3S19 4 16 4 11 2 8 2 4 3 4 3Z"/><path d="M4 22V15"/></>,
    star: <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" strokeLinejoin="round"/>,
    drag: <><circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/></>,
    list: <><path d="M8 6H21"/><path d="M8 12H21"/><path d="M8 18H21"/><circle cx="3.5" cy="6" r="1" fill="currentColor"/><circle cx="3.5" cy="12" r="1" fill="currentColor"/><circle cx="3.5" cy="18" r="1" fill="currentColor"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51L15.42 17.49"/><path d="M15.41 6.51L8.59 10.49"/></>,
    logout: <><path d="M9 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H9"/><path d="M16 17L21 12L16 7"/><path d="M21 12H9"/></>,
    more: <><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></>,
    upload: <><path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15"/><path d="M17 8L12 3L7 8"/><path d="M12 3V15"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...rest}>
      {paths[name]}
    </svg>
  );
};

window.Icon = Icon;
