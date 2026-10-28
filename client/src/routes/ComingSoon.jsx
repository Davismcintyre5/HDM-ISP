import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import Card from '../components/ui/Card';

export default function ComingSoon() {
  const { pathname } = useLocation();
  return (
    <Card padding="lg">
      <EmptyState
        icon={<Construction className="h-10 w-10" />}
        title="Coming soon"
        description={`The page at ${pathname} is being built. Check back shortly.`}
      />
    </Card>
  );
}