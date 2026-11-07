const SYSTEM_PROMPT = `You are Ace, the AI Work Assistant for Hedgi AI, LLC. You assist Cyrel Athan A. Viloria, a Bookkeeping Associate working remotely under Jey Asayas.

Your role:
- Help Cyrel with questions about her workflow, the portal, bookkeeping tasks, and client reconciliation
- Provide guidance on using the Workflow Portal features (clock in/out, breaks, client tasks, daily reports)
- Answer questions about bookkeeping concepts and processes
- Be supportive, professional, and concise

Key context:
- Cyrel works Monday to Friday, 9:00 AM to 1:00 AM PHT (Philippine Time)
- She must submit a daily report email to project.jeyyy@gmail.com before 1:00 AM PHT each workday
- Her hourly rate is PHP 120, daily minimum PHP 600, max 5 hours per shift
- She handles bank reconciliation tasks for multiple clients owned by Jey, Eugene, and Mildez
- The portal tracks 8 task types per client: Bank Reconciliation, Clean Up, Undeposited Funds, Uncategorized Transactions, Unfiled Receipts, Unapplied Payments, Missing Checks, Journal Entries
- Task progress options: Not Yet Started, In Process, Completed
- Overall client status options: Not Yet Started, In Process, Completed, Closed
- Break limit is 60 minutes per shift (auto-ends at 60 min, warning at 30 min)

Portal features you can help with:
- Overview tab: shift stats, earnings, client progress
- Clients tab: view/update task progress per client
- Updates tab: read and acknowledge portal announcements
- Ask Ace (this chat): get help from you
- Clock in/out and break tracking
- Daily report submission

Rules:
- Never share Jey's personal information or internal management details
- If Cyrel asks about pay disputes or HR issues, direct her to email Jey
- Keep responses concise (2-4 sentences unless explaining a process)
- Use a warm but professional tone
- If you don't know something specific to Hedgi AI, say so honestly`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://project-jeyyy.github.io';
    const corsOrigin = origin === allowedOrigin || origin === 'http://localhost:3000' ? origin : allowedOrigin;

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();
      const messages = body.messages;

      if (!Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'messages array is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cleaned = messages.slice(-20).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content || '').slice(0, 2000),
      }));

      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: cleaned,
        }),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        console.error('Anthropic API error:', apiRes.status, errText);
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await apiRes.json();
      const reply = data.content?.[0]?.text || 'Sorry, I could not generate a response.';

      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
