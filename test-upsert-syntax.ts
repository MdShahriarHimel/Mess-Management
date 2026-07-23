import { meals } from "./src/db/schema.js";
import { getTableColumns } from "drizzle-orm";
const columns = getTableColumns(meals);
console.log(Object.keys(columns));
