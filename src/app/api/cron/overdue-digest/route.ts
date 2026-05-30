import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date(new Date().toDateString()).toISOString();

  const { data: overdueTasks, error } = await supabase
    .from("tasks")
    .select("id, title, type, due_date, contact_id, user_id, contacts(name, email)")
    .eq("completed", false)
    .lt("due_date", today)
    .order("user_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!overdueTasks || overdueTasks.length === 0) {
    return NextResponse.json({ sent: 0, message: "No overdue tasks" });
  }

  const tasksByUser: Record<string, typeof overdueTasks> = {};
  for (const task of overdueTasks) {
    if (!tasksByUser[task.user_id]) {
      tasksByUser[task.user_id] = [];
    }
    tasksByUser[task.user_id].push(task);
  }

  const { data: users } = await supabase.auth.admin.listUsers();
  const userMap = new Map((users?.users || []).map((u) => [u.id, u]));

  let sent = 0;
  for (const [userId, tasks] of Object.entries(tasksByUser)) {
    const user = userMap.get(userId);
    if (!user?.email) continue;

    const taskListHtml = tasks
      .map((t) => {
        const contact = (t.contacts as any) as { name: string; email: string | null } | null;
        const contactName = contact?.name || "Unknown";
        return `<li style="margin-bottom:8px">
          <strong>${t.title}</strong> — ${contactName}
          <br><span style="color:#999;font-size:13px">Due: ${new Date(t.due_date).toLocaleDateString()} · ${t.type}</span>
        </li>`;
      })
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#333">You have ${tasks.length} overdue task${tasks.length !== 1 ? "s" : ""}</h2>
        <ul style="padding:0;list-style:none">${taskListHtml}</ul>
        <p style="margin-top:24px">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">View Tasks</a>
        </p>
      </div>
    `;

    await sendEmail(user.email, `You have ${tasks.length} overdue task${tasks.length !== 1 ? "s" : ""}`, html);
    sent++;
  }

  return NextResponse.json({ sent, tasks: overdueTasks.length });
}
