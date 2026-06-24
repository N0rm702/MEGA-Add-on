"use server";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

// Helper to assert authentication
async function getUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized access. Please log in.");
  }
  return userId;
}

// Fetch tasks for a given MEGA URL
export async function getTasksAction(megaUrl) {
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("mega_url", megaUrl);

    if (error) throw error;

    return {
      success: true,
      tasks: data.map(t => ({
        id: t.id,
        megaId: t.mega_id || null,
        title: t.title,
        path: t.path,
        completed: t.completed,
        priority: t.priority || "Medium",
        status: t.status || "To Do",
        notes: t.notes || ""
      }))
    };
  } catch (err) {
    console.error("getTasksAction error:", err.message);
    return { success: false, error: err.message, tasks: [] };
  }
}

// Sync/Upsert a task
export async function syncTaskAction(task, megaUrl) {
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("tasks")
      .upsert({
        id: task.id,
        user_id: userId,
        mega_id: task.megaId || null,
        mega_url: megaUrl,
        title: task.title,
        path: task.path,
        completed: !!task.completed,
        priority: task.priority || "Medium",
        status: task.status || "To Do",
        notes: task.notes || "",
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("syncTaskAction error:", err.message);
    return { success: false, error: err.message };
  }
}

// Delete a task
export async function deleteTaskAction(taskId) {
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("deleteTaskAction error:", err.message);
    return { success: false, error: err.message };
  }
}

// Fetch link histories
export async function getHistoryAction() {
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("parsed_links")
      .select("*")
      .eq("user_id", userId)
      .order("last_accessed", { ascending: false })
      .limit(5);

    if (error) throw error;

    return {
      success: true,
      history: data.map(item => ({
        url: item.url,
        name: item.name,
        timestamp: new Date(item.last_accessed).toLocaleString()
      }))
    };
  } catch (err) {
    console.error("getHistoryAction error:", err.message);
    return { success: false, error: err.message, history: [] };
  }
}

// Add/Upsert a link to history
export async function saveHistoryAction(url, name) {
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("parsed_links")
      .upsert({
        user_id: userId,
        url,
        name,
        last_accessed: new Date().toISOString()
      }, { onConflict: "user_id,url" });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("saveHistoryAction error:", err.message);
    return { success: false, error: err.message };
  }
}

// Clear all link history
export async function clearHistoryAction() {
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("parsed_links")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("clearHistoryAction error:", err.message);
    return { success: false, error: err.message };
  }
}
