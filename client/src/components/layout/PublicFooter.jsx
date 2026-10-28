import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import LegalModal from '../public/LegalModal';
import { useSite } from '../../context/SiteContext';
import { formatPhone } from '../../utils/format';

export default function PublicFooter() {
  const [legal, setLegal] = useState(null);
  const { siteSettings } = useSite();

  const appName = siteSettings?.['branding.appName'] || 'HDM Technologies';
  const supportEmail = siteSettings?.['support.email'] || 'support@hdm.co.ke';
  const supportPhone = siteSettings?.['support.phone'] || '254768784909';

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Hotspot billing and voucher management for Kenyan ISPs.
          </p>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div>
              <a
                href={`mailto:${supportEmail}`}
                className="hover:text-slate-900 dark:hover:text-slate-100 break-all"
              >
                {supportEmail}
              </a>
            </div>
            <div>
              <a
                href={`tel:+${supportPhone.replace(/\D/g, '')}`}
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                {formatPhone(supportPhone)}
              </a>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Product
          </div>
          <ul className="space-y-1 text-sm">
            <li><Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Home</Link></li>
            <li><Link to="/faqs" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">FAQs</Link></li>
            <li><Link to="/help" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Help</Link></li>
            <li><Link to="/contact" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Contact</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Account
          </div>
          <ul className="space-y-1 text-sm">
            <li><Link to="/login" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Sign in</Link></li>
            <li><Link to="/register" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Register</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Legal
          </div>
          <ul className="space-y-1 text-sm">
            <li><button onClick={() => setLegal('terms')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Terms</button></li>
            <li><button onClick={() => setLegal('privacy')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Privacy</button></li>
            <li><button onClick={() => setLegal('refund')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Refunds</button></li>
            <li><button onClick={() => setLegal('aup')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Acceptable Use</button></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} {appName}. All rights reserved.</span>
          <span>{formatPhone(supportPhone)}</span>
        </div>
      </div>

      <LegalModal open={!!legal} variant={legal || 'terms'} onClose={() => setLegal(null)} />
    </footer>
  );
}