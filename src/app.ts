import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import govbotRoutes from "./routes/govbotRoutes";

const app: Application = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api/govbot", govbotRoutes);

export default app;
