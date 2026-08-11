import "dotenv/config";
import app from "./app.js";
import { cleanupOverdueTasks } from "./features/tasks/tasks.service.js";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running on PORT : ${PORT}`)
})

cleanupOverdueTasks().catch((err) => console.error("Initial overdue task cleanup failed:", err));
setInterval(() => {
    cleanupOverdueTasks().catch((err) => console.error("Overdue task cleanup failed:", err));
}, 60 * 60 * 1000);
