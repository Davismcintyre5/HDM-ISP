import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../context/SiteContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

const SIZES = {
  sm: { box: 'h-7 w-7 text-[10px]', img: 'h-7', title: 'text-sm' },
  md: { box: 'h-9 w-9 text-xs', img: 'h-9', title: 'text-base' },
  lg: { box: 'h-12 w-12 text-sm', img: 'h-12', title: 'text-lg' },
};

function FallbackBadge({ size = 'md' }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-brand-600 dark:bg-brand-500 text-white font-bold grid place-items-center',
        SIZES[size].box
      )}
    >
      H
    </div>
  );
}

export default function Logo({
  size = 'md',
  showWordmark = true,
  showSublabel = false,
  href,
  className,
}) {
  const { siteSettings } = useSite();
  const { theme } = useTheme();
  const [imgFailed, setImgFailed] = useState(false);

  const lightLogo = siteSettings?.['branding.logoUrl'];
  const darkLogo = siteSettings?.['branding.logoDarkUrl'];
  const useDark = theme === 'dark' && !!darkLogo;

  const logoUrl = useDark ? darkLogo : lightLogo;
  const title = siteSettings?.['branding.appName'] || 'HDM';

  useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  const showImage = !!logoUrl && !imgFailed;

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      {showImage ? (
        <img
          src={logoUrl}
          alt={title}
          onError={() => setImgFailed(true)}
          className={cn('w-auto object-contain', SIZES[size].img)}
        />
      ) : (
        <FallbackBadge size={size} />
      )}
      {showWordmark && (
        <div className="leading-tight min-w-0">
          <div
            className={cn(
              'font-semibold text-slate-900 dark:text-slate-100 truncate',
              SIZES[size].title
            )}
          >
            {title}
          </div>
          {showSublabel && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5">
              Provider
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) return <Link to={href}>{content}</Link>;
  return content;
}