import express from "express";
import cors from "cors";
import MetaRouter from "./routes/meta";
import SqlAgentRouter from "./routes/sqlAgent";
import { env } from "./utils/env";

const app = express();

app.use(express.json());

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

app.use("/sql-agent", SqlAgentRouter);
app.use("/meta", MetaRouter);

app.listen(env.PORT, () => {
  console.log(`Server is now running on port: ${env.PORT}`);
});
