import { redirect } from 'next/navigation';

export default function PlansRedirectPage() {
  redirect('/dashboard/settings/plans');
}
