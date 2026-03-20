import { useLocation, useNavigate } from 'react-router-dom';
import styles from './AppShell.module.css';

const NAV = [
  { path: '/',         label: 'Home',    icon: IconHome },
  { path: '/stats',    label: 'Stats',   icon: IconStats },
  { path: '/plan',     label: 'Plan',    icon: IconPlan },
  { path: '/journal',  label: 'Journal', icon: IconJournal },
  { path: '/settings', label: 'Réglages', icon: IconSettings },
];

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pageLabel = NAV.find((n) => n.path === pathname)?.label || 'VapeDown';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>VD</div>
          <span className={styles.appName}>VapeDown</span>
        </div>
        <span className={styles.pageLabel}>{pageLabel}</span>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.footer}>
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              className={`${styles.navBtn} ${active ? styles.navActive : ''}`}
              onClick={() => navigate(path)}
              aria-label={label}
            >
              <Icon active={active} />
              <span className={styles.navLabel}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function IconHome({ active }) {
  const c = active ? '#10D980' : '#254535';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 9.5L10 3L17 9.5V17H13V13H7V17H3V9.5Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill={active ? '#10D98020' : 'none'} />
    </svg>
  );
}
function IconStats({ active }) {
  const c = active ? '#10D980' : '#254535';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3"  y="11" width="3" height="6" rx="1" fill={c} opacity={active ? 1 : 0.5} />
      <rect x="8"  y="7"  width="3" height="10" rx="1" fill={c} opacity={active ? 1 : 0.5} />
      <rect x="13" y="3"  width="3" height="14" rx="1" fill={c} />
    </svg>
  );
}
function IconPlan({ active }) {
  const c = active ? '#10D980' : '#254535';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke={c} strokeWidth="1.5" fill={active ? '#10D98020' : 'none'} />
      <line x1="7" y1="8"  x2="13" y2="8"  stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="11" x2="11" y2="11" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconJournal({ active }) {
  const c = active ? '#10D980' : '#254535';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.5" fill={active ? '#10D98020' : 'none'} />
      <polyline points="10,6.5 10,10 12.5,12.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSettings({ active }) {
  const c = active ? '#10D980' : '#254535';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.5" stroke={c} strokeWidth="1.5" />
      <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.6 4.6l1.3 1.3M14.1 14.1l1.3 1.3M15.4 4.6l-1.3 1.3M5.9 14.1l-1.3 1.3" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
