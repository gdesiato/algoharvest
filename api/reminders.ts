/// <reference types="node" />

import { Resend } from 'resend';

import { createClient } from '@supabase/supabase-js';

const resend = new Resend(
  process.env['RESEND_API_KEY']
);

const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

export default async function handler(
  req: any,
  res: any
) {

  const today = new Date()
    .toISOString()
    .split('T')[0];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('reminders_enabled', true);

  for (const profile of profiles || []) {

    const { data: problems } = await supabase
      .from('problems')
      .select('*')
      .eq('user_id', profile.id)
      .lte('next_review', today);

    if (!problems?.length) {
      continue;
    }

    await resend.emails.send({
      from: 'AlgoHarvest <onboarding@resend.dev>',

      to: profile.email,

      subject: '🌱 Ready to harvest',

      html: `
        <h2>AlgoHarvest Reminder</h2>

        <p>
          You have ${problems.length}
          problems ready for review.
        </p>
      `
    });
  }

  res.status(200).json({
    success: true
  });
}