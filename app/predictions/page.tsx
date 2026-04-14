import { redirect } from 'next/navigation';

export default function PredictionsPage() {
  redirect('/?mode=predictions');
}
