import Badge from './Badge';
import { statusLabel, statusTone } from '../../utils/status';

export default function StatusBadge({ status, dot = true, className }) {
  return (
    <Badge tone={statusTone(status)} dot={dot} className={className}>
      {statusLabel(status)}
    </Badge>
  );
}