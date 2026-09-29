import { DailyRoutine, DepartmentBriefing, EodClosure } from '../models/dailyOperations.model.js';
import { sendSuccess, sendError } from '../utils/response.helper.js';

const DEFAULT_ROUTINES = [
  { time: '09:30', title: 'Attendance & Check-in', subtitle: 'HR & Administration' },
  { time: '09:45', title: 'Department Daily Briefing', subtitle: 'Department Heads' },
  { time: '10:00', title: 'Priority Execution Window', subtitle: 'All Teams' },
  { time: '13:00', title: 'Mid-day Project Health Review', subtitle: 'Project Managers' },
  { time: '16:30', title: 'Client / Delivery Review', subtitle: 'Department Heads' },
  { time: '17:00', title: 'EOD Reporting & Escalation', subtitle: 'All Departments' },
  { time: '17:30', title: 'Management Daily Review', subtitle: 'MD / Management' }
];

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Fetch all Daily Operations data for a given date (defaults to today)
 */
export const getDailyOperations = async (req, res) => {
  try {
    const dateString = req.query.date || getTodayDateString();

    // Check routine items for the date
    let routines = await DailyRoutine.find({ dateString }).sort({ time: 1 });

    // Seed default routines if none exist for today
    if (!routines || routines.length === 0) {
      const docsToInsert = DEFAULT_ROUTINES.map(r => ({
        dateString,
        time: r.time,
        title: r.title,
        subtitle: r.subtitle,
        status: 'pending'
      }));
      routines = await DailyRoutine.insertMany(docsToInsert);
    }

    // Fetch department briefings
    const briefings = await DepartmentBriefing.find({ dateString }).sort({ createdAt: -1 });

    // Fetch EOD closures
    const eodClosures = await EodClosure.find({ dateString }).sort({ createdAt: -1 });

    return sendSuccess(res, 'Daily Operations retrieved successfully', {
      dateString,
      routines,
      briefings,
      eodClosures
    });
  } catch (error) {
    console.error('Error fetching Daily Operations:', error);
    return sendError(res, error.message || 'Failed to fetch Daily Operations', 500);
  }
};

/**
 * Toggle status of a Routine item (pending <-> completed)
 */
export const toggleRoutineStatus = async (req, res) => {
  try {
    const { routineId } = req.params;
    const routine = await DailyRoutine.findById(routineId);

    if (!routine) {
      return sendError(res, 'Routine item not found', 404);
    }

    const newStatus = routine.status === 'completed' ? 'pending' : 'completed';
    routine.status = newStatus;
    routine.completedBy = newStatus === 'completed' ? (req.user._id || req.user.id) : null;
    routine.completedByName = newStatus === 'completed' ? (req.user.name || 'User') : '';
    routine.completedAt = newStatus === 'completed' ? new Date() : null;

    await routine.save();

    return sendSuccess(res, `Routine item marked as ${newStatus}`, routine);
  } catch (error) {
    console.error('Error toggling routine status:', error);
    return sendError(res, error.message || 'Failed to toggle routine status', 500);
  }
};

/**
 * Add custom routine item
 */
export const addRoutineItem = async (req, res) => {
  try {
    const { time, title, subtitle, date } = req.body;
    const dateString = date || getTodayDateString();

    if (!time || !title) {
      return sendError(res, 'Time and Title are required', 400);
    }

    const newRoutine = new DailyRoutine({
      dateString,
      time,
      title,
      subtitle: subtitle || '',
      status: 'pending'
    });

    await newRoutine.save();
    return sendSuccess(res, 'Routine item created successfully', newRoutine, 201);
  } catch (error) {
    console.error('Error adding routine item:', error);
    return sendError(res, error.message || 'Failed to add routine item', 500);
  }
};

/**
 * Save / Update Department Daily Briefing
 */
export const saveDepartmentBriefing = async (req, res) => {
  try {
    const { department, priority, deliverables, blockers, date } = req.body;
    const dateString = date || getTodayDateString();
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || 'User';

    if (!department) {
      return sendError(res, 'Department is required', 400);
    }

    // Check if briefing already exists for department & date
    let briefing = await DepartmentBriefing.findOne({ dateString, department });

    if (briefing) {
      briefing.priority = priority !== undefined ? priority : briefing.priority;
      briefing.deliverables = deliverables !== undefined ? deliverables : briefing.deliverables;
      briefing.blockers = blockers !== undefined ? blockers : briefing.blockers;
      briefing.submittedBy = userId;
      briefing.submittedByName = userName;
      await briefing.save();
    } else {
      briefing = new DepartmentBriefing({
        dateString,
        department,
        priority: priority || '',
        deliverables: deliverables || '',
        blockers: blockers || '',
        submittedBy: userId,
        submittedByName: userName
      });
      await briefing.save();
    }

    return sendSuccess(res, 'Department briefing saved successfully', briefing);
  } catch (error) {
    console.error('Error saving department briefing:', error);
    return sendError(res, error.message || 'Failed to save department briefing', 500);
  }
};

/**
 * Submit / Update EOD Closure Report
 */
export const submitEodClosure = async (req, res) => {
  try {
    const { completedToday, pendingReason, tomorrowPriority, department, date } = req.body;
    const dateString = date || getTodayDateString();
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || 'User';

    let closure = await EodClosure.findOne({ dateString, user: userId });

    if (closure) {
      closure.completedToday = completedToday !== undefined ? completedToday : closure.completedToday;
      closure.pendingReason = pendingReason !== undefined ? pendingReason : closure.pendingReason;
      closure.tomorrowPriority = tomorrowPriority !== undefined ? tomorrowPriority : closure.tomorrowPriority;
      closure.department = department || closure.department;
      closure.userName = userName;
      await closure.save();
    } else {
      closure = new EodClosure({
        dateString,
        user: userId,
        userName,
        department: department || req.user.department || '',
        completedToday: completedToday || '',
        pendingReason: pendingReason || '',
        tomorrowPriority: tomorrowPriority || ''
      });
      await closure.save();
    }

    return sendSuccess(res, 'EOD closure submitted successfully', closure);
  } catch (error) {
    console.error('Error submitting EOD closure:', error);
    return sendError(res, error.message || 'Failed to submit EOD closure', 500);
  }
};
