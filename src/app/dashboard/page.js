"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { getTasksAction, syncTaskAction, deleteTaskAction } from "@/app/actions/todo";
import { 
  ArrowLeft, 
  Folder, 
  FileCode, 
  ChevronRight, 
  CheckSquare, 
  Plus, 
  Search, 
  Trash2, 
  Clock,
  Check,
  CheckCircle2,
  User
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  
  // App state
  const [structure, setStructure] = useState(null);
  const [megaUrl, setMegaUrl] = useState("");
  const [flatMap, setFlatMap] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  
  // To-Do list state
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Load structure, user, and tasks on mount
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const initDashboard = async () => {
      const savedStructure = localStorage.getItem("currentMegaStructure");
      const savedUrl = localStorage.getItem("currentMegaUrl");

      if (!savedStructure || !savedUrl) {
        router.push("/");
        return;
      }

      try {
        const parsedStructure = JSON.parse(savedStructure);
        setStructure(parsedStructure);
        setMegaUrl(savedUrl);

        // Build flat map
        const map = {};
        const buildMap = (node, path = "") => {
          const currentPath = path ? `${path}/${node.name}` : node.name;
          const flatNode = {
            ...node,
            path: currentPath,
            descendants: []
          };
          map[node.id] = flatNode;

          if (node.directory && node.children) {
            node.children.forEach(child => {
              buildMap(child, currentPath);
              flatNode.descendants.push(child.id, ...map[child.id].descendants);
            });
          }
        };
        
        buildMap(parsedStructure);
        setFlatMap(map);
        setExpandedFolders({ [parsedStructure.id]: true });

        // Load tasks from Server Action (or fallback to localStorage)
        let loadedTasks = null;
        let loadedFromDb = false;

        const res = await getTasksAction(savedUrl);
        if (res.success && res.tasks && res.tasks.length > 0) {
          loadedTasks = res.tasks;
          loadedFromDb = true;
        } else if (!res.success) {
          console.warn("Server Action tasks load failed (Tables may not exist yet). Using local fallback:", res.error);
        }

        // Fallback if not loaded from DB
        if (!loadedFromDb) {
          const savedTasks = localStorage.getItem(`tasks_${savedUrl}`);
          if (savedTasks) {
            loadedTasks = JSON.parse(savedTasks);
          } else {
            // First load default tasks
            const initialTasks = [];
            Object.keys(map).forEach(id => {
              const node = map[id];
              if (!node.directory) {
                initialTasks.push({
                  id: `task-${id}`,
                  megaId: id,
                  title: node.name,
                  path: node.path.substring(0, node.path.lastIndexOf("/")),
                  completed: false,
                  priority: "Medium",
                  status: "To Do",
                  notes: ""
                });
              }
            });
            loadedTasks = initialTasks;
            localStorage.setItem(`tasks_${savedUrl}`, JSON.stringify(initialTasks));
          }
        }

        setTasks(loadedTasks);

        // Sync selected checkboxes in tree with loaded tasks
        const initiallySelected = new Set();
        loadedTasks.forEach(task => {
          if (task.megaId) {
            initiallySelected.add(task.megaId);
          }
        });

        // Highlight folder structures whose children are all checked
        Object.keys(map).forEach(id => {
          const node = map[id];
          if (node.directory && node.descendants.length > 0) {
            const allChecked = node.descendants.every(dId => 
              !map[dId].directory && initiallySelected.has(dId)
            );
            if (allChecked) {
              initiallySelected.add(id);
            }
          }
        });

        setSelectedIds(initiallySelected);

      } catch (e) {
        console.error("Error setting up dashboard data:", e);
        router.push("/");
      }
    };

    initDashboard();
  }, [router, isLoaded, isSignedIn]);

  // Sync state modifications Server Action helpers
  const syncTask = async (task) => {
    if (!isSignedIn) return;
    const res = await syncTaskAction(task, megaUrl);
    if (!res.success) {
      console.warn("DB task sync failed:", res.error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!isSignedIn) return;
    const res = await deleteTaskAction(taskId);
    if (!res.success) {
      console.warn("DB task delete failed:", res.error);
    }
  };

  const saveTasks = (updatedTasks) => {
    setTasks(updatedTasks);
    if (megaUrl) {
      localStorage.setItem(`tasks_${megaUrl}`, JSON.stringify(updatedTasks));
    }
  };

  // Format File Size
  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Folder toggling
  const toggleFolder = (id, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Checkbox evaluation
  const getCheckboxState = (id) => {
    if (selectedIds.has(id)) return "checked";
    
    const node = flatMap[id];
    if (node && node.directory && node.descendants.length > 0) {
      const selectedDescendants = node.descendants.filter(dId => selectedIds.has(dId));
      if (selectedDescendants.length === node.descendants.length) {
        return "checked";
      } else if (selectedDescendants.length > 0) {
        return "partial";
      }
    }
    return "unchecked";
  };

  // Handle tree clicks
  const handleCheckboxClick = async (id, e) => {
    e.stopPropagation();
    const node = flatMap[id];
    if (!node) return;

    const newSelected = new Set(selectedIds);
    const isCurrentlyChecked = getCheckboxState(id) === "checked";
    const targetIds = [id, ...node.descendants];

    let tasksToSync = [];
    let taskIdsToDelete = [];

    if (isCurrentlyChecked) {
      // Uncheck
      targetIds.forEach(tId => newSelected.delete(tId));
      
      let parent = Object.values(flatMap).find(n => n.directory && n.children && n.children.some(c => c.id === id));
      while (parent) {
        newSelected.delete(parent.id);
        const currentParentId = parent.id;
        parent = Object.values(flatMap).find(n => n.directory && n.children && n.children.some(c => c.id === currentParentId));
      }

      // Collect IDs to delete
      tasks.forEach(task => {
        if (task.megaId && targetIds.includes(task.megaId)) {
          taskIdsToDelete.push(task.id);
        }
      });
    } else {
      // Check
      targetIds.forEach(tId => newSelected.add(tId));

      Object.keys(flatMap).forEach(fId => {
        const fNode = flatMap[fId];
        if (fNode.directory && fNode.descendants.length > 0) {
          const allChecked = fNode.descendants.every(dId => newSelected.has(dId));
          if (allChecked) {
            newSelected.add(fId);
          }
        }
      });

      // Prepare files to insert
      Object.keys(flatMap).forEach(fId => {
        const fNode = flatMap[fId];
        if (!fNode.directory && newSelected.has(fId)) {
          const exists = tasks.some(t => t.megaId === fId);
          if (!exists) {
            tasksToSync.push({
              id: `task-${fId}`,
              megaId: fId,
              title: fNode.name,
              path: fNode.path.substring(0, fNode.path.lastIndexOf("/")),
              completed: false,
              priority: "Medium",
              status: "To Do",
              notes: ""
            });
          }
        }
      });
    }

    setSelectedIds(newSelected);

    // Apply state changes locally
    let updatedTasks = tasks.filter(t => !taskIdsToDelete.includes(t.id));
    updatedTasks = [...updatedTasks, ...tasksToSync];
    saveTasks(updatedTasks);

    // Sync changes to DB
    if (isSignedIn) {
      for (const idToDelete of taskIdsToDelete) {
        await deleteTask(idToDelete);
      }
      for (const taskToSync of tasksToSync) {
        await syncTask(taskToSync);
      }
    }
  };

  // Toggle single task status
  const handleTaskToggle = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const nextCompleted = !task.completed;
    const updatedTask = { 
      ...task, 
      completed: nextCompleted, 
      status: nextCompleted ? "Completed" : "To Do" 
    };

    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
    saveTasks(updatedTasks);
    await syncTask(updatedTask);
  };

  // Change single task priority/notes
  const handleTaskChange = async (taskId, field, value) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, [field]: value };
    if (field === "status") {
      updatedTask.completed = value === "Completed";
    }

    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
    saveTasks(updatedTasks);
    await syncTask(updatedTask);
  };

  // Add manual task
  const handleAddManualTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: `manual-${Date.now()}`,
      title: newTaskTitle.trim(),
      path: "Manual Task",
      completed: false,
      priority: "Medium",
      status: "To Do",
      notes: ""
    };

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);
    setNewTaskTitle("");
    await syncTask(newTask);
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(updatedTasks);
    await deleteTask(taskId);

    // Sync check status in tree if it was a MEGA node
    if (taskToDelete && taskToDelete.megaId) {
      const newSelected = new Set(selectedIds);
      newSelected.delete(taskToDelete.megaId);
      
      let parent = Object.values(flatMap).find(n => n.directory && n.children && n.children.some(c => c.id === taskToDelete.megaId));
      while (parent) {
        newSelected.delete(parent.id);
        const currentParentId = parent.id;
        parent = Object.values(flatMap).find(n => n.directory && n.children && n.children.some(c => c.id === currentParentId));
      }
      
      setSelectedIds(newSelected);
    }
  };

  // Select All
  const selectAll = async () => {
    const newSelected = new Set();
    const tasksToSync = [];
    const updatedTasks = [...tasks];

    Object.keys(flatMap).forEach(id => {
      newSelected.add(id);
      const node = flatMap[id];
      if (!node.directory) {
        const exists = updatedTasks.some(t => t.megaId === id);
        if (!exists) {
          const newTask = {
            id: `task-${id}`,
            megaId: id,
            title: node.name,
            path: node.path.substring(0, node.path.lastIndexOf("/")),
            completed: false,
            priority: "Medium",
            status: "To Do",
            notes: ""
          };
          updatedTasks.push(newTask);
          tasksToSync.push(newTask);
        }
      }
    });

    setSelectedIds(newSelected);
    saveTasks(updatedTasks);

    if (isSignedIn) {
      for (const t of tasksToSync) {
        await syncTask(t);
      }
    }
  };

  // Deselect All
  const deselectAll = async () => {
    setSelectedIds(new Set());
    
    const megaTaskIds = tasks.filter(t => t.megaId).map(t => t.id);
    const updatedTasks = tasks.filter(t => !t.megaId);
    saveTasks(updatedTasks);

    if (isSignedIn) {
      for (const id of megaTaskIds) {
        await deleteTask(id);
      }
    }
  };

  // Render nodes recursively
  const renderTreeNode = (node) => {
    if (!node) return null;
    
    const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
    const hasMatchingDescendant = node.directory && node.children && node.children.some(child => {
      const checkDescendantMatch = (n) => {
        if (n.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
        if (n.directory && n.children) return n.children.some(checkDescendantMatch);
        return false;
      };
      return checkDescendantMatch(child);
    });

    if (searchQuery && !matchesSearch && !hasMatchingDescendant) return null;

    const isExpanded = expandedFolders[node.id];
    const checkboxState = getCheckboxState(node.id);

    return (
      <div key={node.id} className="tree-node">
        <div className="tree-row" style={{ paddingLeft: `${node.directory ? '0.5rem' : '1.75rem'}` }}>
          {node.directory && (
            <span className={`tree-chevron ${isExpanded ? 'expanded' : ''}`} onClick={(e) => toggleFolder(node.id, e)}>
              <ChevronRight size={16} />
            </span>
          )}
          
          <span className={`tree-node-icon ${node.directory ? 'folder' : 'file'}`}>
            {node.directory ? <Folder size={16} /> : <FileCode size={16} />}
          </span>

          <span className="tree-label" title={node.name}>
            {node.name}
            {!node.directory && node.size > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                ({formatSize(node.size)})
              </span>
            )}
          </span>

          <span 
            className={`tree-checkbox-wrapper ${checkboxState === 'checked' ? 'checked' : checkboxState === 'partial' ? 'partial' : ''}`}
            onClick={(e) => handleCheckboxClick(node.id, e)}
          >
            {checkboxState === 'checked' && <Check size={12} style={{ color: 'white', strokeWidth: 3.5 }} />}
          </span>
        </div>

        {node.directory && isExpanded && node.children && (
          <div className="tree-children">
            {node.children.map(renderTreeNode)}
          </div>
        )}
      </div>
    );
  };

  // Group tasks by folder
  const getGroupedTasks = () => {
    const groups = {};
    tasks.forEach(task => {
      const groupKey = task.path || "Root Folder";
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    return groups;
  };

  const groupedTasks = getGroupedTasks();
  const sortedGroupKeys = Object.keys(groupedTasks).sort((a, b) => {
    if (a === "Manual Task") return 1;
    if (b === "Manual Task") return -1;
    return a.localeCompare(b);
  });

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? ((completedTasksCount / tasks.length) * 100).toFixed(1) : "0.0";

  return (
    <>
      <nav className="navbar">
        <div className="brand" onClick={() => router.push("/")} style={{ cursor: 'pointer' }}>
          <CheckSquare className="brand-icon" size={24} />
          <span>MEGA Task Sync</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {isLoaded && isSignedIn && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <User size={14} />
                <span>{user.primaryEmailAddress?.emailAddress}</span>
              </div>
              <UserButton afterSignOutUrl="/sign-in" />
            </>
          )}
          
          <button className="back-button" onClick={() => router.push("/")} style={{ fontSize: '0.9rem' }}>
            <ArrowLeft size={16} />
            <span>Link Hub</span>
          </button>
        </div>
      </nav>

      <div className="workspace-container">
        {/* Left Explorer Pane */}
        <aside className="explorer-pane">
          <div className="explorer-header">
            <div className="explorer-title-wrapper">
              <span className="explorer-title">
                <Folder size={18} style={{ color: 'var(--color-primary)' }} />
                <span>File Explorer</span>
              </span>
            </div>

            <div className="explorer-search-wrapper">
              <input 
                type="text" 
                className="explorer-search-input" 
                placeholder="Filter files..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="explorer-search-icon" size={14} />
            </div>

            <div className="explorer-actions">
              <button className="explorer-action-link" onClick={selectAll}>Select All</button>
              <button className="explorer-action-link" onClick={deselectAll} style={{ color: 'var(--text-muted)' }}>Clear All</button>
            </div>
          </div>

          <div className="explorer-content">
            {structure ? renderTreeNode(flatMap[structure.id]) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock className="spinner" size={24} style={{ marginBottom: '0.5rem' }} />
                <p>Loading files...</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Todo Checklist Pane */}
        <main className="todo-pane">
          <header className="todo-header">
            <div className="todo-stats">
              <h2 className="todo-title">Task List</h2>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Syncing {tasks.filter(t => t.megaId).length} files from {structure?.name || "MEGA URL"}
              </span>
            </div>

            <div className="progress-container">
              <div className="progress-label-row">
                <span>Overall Progress</span>
                <span>{progressPercent}% ({completedTasksCount}/{tasks.length})</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </header>

          {/* Quick Add Custom Task form */}
          <form className="quick-add-form" onSubmit={handleAddManualTask}>
            <input 
              type="text" 
              className="text-input" 
              placeholder="Add custom task (e.g. Write review report, coordinate deployments)..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              style={{ padding: '0.65rem 1rem 0.65rem 1rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              <Plus size={18} />
              <span>Add</span>
            </button>
          </form>

          {/* Todo List View */}
          {tasks.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 className="empty-state-icon" size={48} />
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Your Checklist is Empty</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                  Select files or subdirectories from the File Explorer on the left or add a custom task above to build your list.
                </p>
              </div>
            </div>
          ) : (
            <div className="todo-list-wrapper">
              {sortedGroupKeys.map((groupKey) => {
                const groupTasks = groupedTasks[groupKey];
                const isManualGroup = groupKey === "Manual Task";

                return (
                  <div key={groupKey} className="todo-group-section">
                    <div className="todo-group-header">
                      <Folder size={14} className={`todo-group-icon ${isManualGroup ? 'manual' : ''}`} />
                      <span className="todo-group-title">{groupKey}</span>
                      <span className="todo-group-count">
                        {groupTasks.length} task{groupTasks.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="todo-group-list">
                      {groupTasks.map((task) => (
                        <div key={task.id} className={`todo-card ${task.completed ? 'completed' : ''}`}>
                          
                          {/* Premium Animated Checkbox */}
                          <label className="todo-checkbox-container">
                            <input 
                              type="checkbox" 
                              checked={task.completed}
                              onChange={() => handleTaskToggle(task.id)}
                            />
                            <div className="checkmark">
                              <svg viewBox="0 0 10 10">
                                <polyline points="1.5 5 4.3 7.5 8.5 2.5"></polyline>
                              </svg>
                            </div>
                          </label>

                          {/* Todo Card Details */}
                          <div className="todo-content">
                            <div className="todo-title-row">
                              <h4 className="todo-card-title">{task.title}</h4>
                              
                              <div className="todo-inline-actions">
                                {/* Status Select dropdown */}
                                <select 
                                  className="todo-select"
                                  value={task.status}
                                  onChange={(e) => handleTaskChange(task.id, 'status', e.target.value)}
                                >
                                  <option value="To Do">To Do</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>

                                {/* Priority Selection dropdown */}
                                <select 
                                  className={`todo-select badge ${
                                    task.priority === 'High' ? 'badge-high' : 
                                    task.priority === 'Medium' ? 'badge-medium' : 'badge-low'
                                  }`}
                                  value={task.priority}
                                  onChange={(e) => handleTaskChange(task.id, 'priority', e.target.value)}
                                >
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                                </select>

                                <button className="todo-card-delete" onClick={() => handleDeleteTask(task.id)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Quick Inline Description/Notes */}
                            <input 
                              type="text" 
                              className="todo-note-input"
                              placeholder="Add specific details or instructions for this task..."
                              value={task.notes}
                              onChange={(e) => handleTaskChange(task.id, 'notes', e.target.value)}
                            />
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
