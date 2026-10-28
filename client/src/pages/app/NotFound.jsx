import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<Home className="h-10 w-10" />}
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      action={<Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>}
    />
  );
}