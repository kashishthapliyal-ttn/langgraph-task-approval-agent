import express from "express";
import cors from "cors";
import SchemaRouter from "./routes/schema";
import SqlAgentRouter from "./routes/sqlAgent";
import { env } from "./utils/env";

const app = express();

app.use(express.json({ limit: "5mb" }));

const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  }),
);

app.use("/schema", SchemaRouter);
app.use("/sql-agent", SqlAgentRouter);

app.listen(env.PORT, () => {
  console.log(`Server is now running on port: ${env.PORT}`);
});
