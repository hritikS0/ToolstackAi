import "dotenv/config";
import http from "http";
import app from "./app.js";
import { initSocketIO } from "./shared/socket/socketManager.js";
import { cleanupOverdueTasks } from "./features/tasks/tasks.service.js";
import { checkDueTaskAndHabitReminders } from "./features/notifications/notifications.service.js";

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);
initSocketIO(server);

server.listen(PORT, () => {
  console.log(`Server and Socket.io running on PORT : ${PORT}`);
});

// Run task cleanup & notification check on start and periodically
cleanupOverdueTasks().catch((err) => console.error("Initial overdue task cleanup failed:", err));
checkDueTaskAndHabitReminders().catch((err) => console.error("Initial reminder check failed:", err));

setInterval(() => {
  cleanupOverdueTasks().catch((err) => console.error("Overdue task cleanup failed:", err));
  checkDueTaskAndHabitReminders().catch((err) => console.error("Reminder check failed:", err));
}, 15 * 60 * 1000); // check every 15 mins
