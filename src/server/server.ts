import express, { Application, Request, Response, NextFunction } from "express";
// import { connectToDatabase } from "../db/db.js";
import "../db/mongo.js";
import cors from "cors";
const app: Application = express();
const PORT: number = Number(process.env.PORT) || 5000;
import errorMiddleware from "../middleware/errorHandler.js";
import swRouter from "../utils/swagger.js";

import * as path from 'path';

import usersRouter from "../routes/users.router.js";
 
import indexRouter from "../routes/index.routes.js";      
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'src', "public")));
app.use(cors());
app.use('/api/docs', swRouter);
app.use('/api', usersRouter);
app.use('/api', indexRouter);

app.get('/api', async (req: Request, res: Response) => {
    try {
        res.status(200).json({
            success: true,
            message: "Welcome to the CodeCrafters campaign API",
            postmen: "https://documenter.getpostman.com/view/24139682/2s93si1pwE"
        });
    } catch (error: unknown) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

app.use(errorMiddleware);
// app.listen(PORT, () => console.log("Server listening on port" + PORT));
app.listen(PORT, () => console.log("Server listening on port" + PORT));

// connectToDatabase().then(() => {
//     app.listen(PORT, () => console.log("Server listening on port" + PORT));

// });     