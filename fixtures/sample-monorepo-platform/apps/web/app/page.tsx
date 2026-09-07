import React from 'react';
import { db } from '@platform/db';

export default async function DashboardPage() {
  const users = await db.user.findMany({
    include: { organization: true },
  });

  return (
    <div>
      <h1>Platform Dashboard</h1>
      <p>Users registered: {users.length}</p>
    </div>
  );
}
