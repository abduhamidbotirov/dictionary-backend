import { Request, Response } from 'express';
import Book from '../schemas/book.schema.js';
import Unit from '../schemas/unit.schema.js';
import ResultSchema from '../schemas/result.schema.js';
import { JWT } from '../utils/jwt.js';
import User from '../schemas/user.schema.js';
import { Telegraf } from 'telegraf';
interface DataItem {
    _id: string;
    engWord: string;
    uzbWord: string;
    unitId: string;
    variants: string[];
    inFact: string;
    question: string;
    role: string;
    answer?: string;
}

interface ResultItem {
    count: number;
    words: DataItem[];
}

interface Result {
    correct: ResultItem;
    incorrect: ResultItem;
}
class EndController {
    public async end(req: Request, res: Response) {
        let data = req.body;
        let token: any = req.headers.token;
        let userId = JWT.VERIFY(token).id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(403).send("you do not have permission to access.");
        }
        try {
            function processItems(data: DataItem[]): {
                correct: DataItem[];
                incorrect: DataItem[];
                error: DataItem[];
                correctCount: number;
                incorrectCount: number;
                correctPercentage: number;
                incorrectPercentage: number;
            } {
                const correct: ResultItem = { count: 0, words: [] };
                const incorrect: ResultItem = { count: 0, words: [] };
                const error: DataItem[] = [];

                for (const item of data) {
                    if (item.inFact === item.answer) {
                        correct.count++;
                        correct.words.push(item);
                    } else if (item.answer) {
                        incorrect.count++;
                        incorrect.words.push(item);
                    } else {
                        error.push(item);
                    }
                }

                const correctCount = correct.count;
                const incorrectCount = incorrect.count;
                const totalCount = correctCount + incorrectCount;
                const correctPercentage = Math.floor((correctCount / totalCount) * 100);
                const incorrectPercentage = Math.floor((incorrectCount / totalCount) * 100);

                return {
                    correct: correct.words,
                    incorrect: incorrect.words,
                    error,
                    correctCount,
                    incorrectCount,
                    correctPercentage,
                    incorrectPercentage,
                };
            }

            const result = processItems(data);
            // information about playgame;

            const unitIds = [
                ...new Set([
                    ...result.correct.map((item) => item.unitId),
                    ...result.incorrect.map((item) => item.unitId),
                ]),
            ];

            const books = await Book.find();

            const booksName = books
                .filter((book) =>
                    book.units.some((unitId) => unitIds.includes(unitId.toString()))
                )
                .map((book) => ({
                    bookname: book.bookname,
                }));
            let bookname = books.filter((book) =>
                book.units.some((unitId) => unitIds.includes(unitId.toString()))
            ).map(book => {
                return {
                    bookname: book.bookname
                };
            })
            const resultItem = {
                correctCount: result.correctCount,
                incorrectCount: result.incorrectCount,
                correct: result.correct,
                incorrect: result.incorrect

            };

            const resultData = {
                correct: {
                    count: resultItem.correctCount,
                    words: resultItem.correct.map((item: any) => ({ ...item })),
                },
                incorrect: {
                    count: resultItem.incorrectCount,
                    words: resultItem.incorrect.map((item: any) => ({ ...item })),
                },
                error: result.error,
                correctCount: result.correctCount,
                incorrectCount: result.incorrectCount,
                correctPercentage: result.correctPercentage,
                incorrectPercentage: result.incorrectPercentage,
                bookName: booksName,
                user: user.username
            };
            // create information about the game
            
       
            res.send({
                books: bookname,
                correct: result.correct,
                incorrect: result.incorrect,
                errorRes: result.error
            });
            if (resultData.correct || resultData.incorrect) {
                const newResult = new ResultSchema({ resultData });
                await newResult.save();

                sendResultsToChannel(newResult, booksName);
            }
        } catch (error: unknown) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    }
}


async function sendResultsToChannel(resultData: any, bookname: any) {
try {
    const bot = new Telegraf('6357487179:AAHyXXD-WZoGMIUfqZ0jBGEDM5dXnpnmaVg');
    const channelId = '@EssentialWordsResult';

    // Format results for Telegram message
    const formattedResults = formatResults(resultData, bookname);

    // Send message to Telegram channel
    await bot.telegram.sendMessage(channelId, formattedResults);
} catch (error) {
    console.error('Error sending results to Telegram channel:', error);
}
}
// Format results for Telegram message (customize as needed)
function formatResults(resultData: any, bookname: any) {
    let message = `✅ Tog'ri: ${resultData.resultData.correct.count}\n`;
    message += `❌ Noto'g'ri: ${resultData.resultData.incorrect.count}\n\n`;
    message += `📚 Kitob nomi: ${bookname[0].bookname}\n`;

    // ... Qolgan ma'lumotlarni kerakli ko'rinishda qo'shing ...

    return message;
}


export default new EndController();

// import { Request, Response } from 'express';
// import Book from '../schemas/book.schema.js';
// import Unit from '../schemas/unit.schema.js';
// import mongoose from 'mongoose';

// interface DataItem {
//     _id: string;
//     engWord: string;
//     uzbWord: string;
//     unitId: string;
//     variants: string[];
//     inFact: string;
//     question: string;
//     role: string;
//     answer?: string;
// }

// interface ResultItem {
//     count: number;
//     words: DataItem[];
// }

// interface Result {
//     correct: ResultItem;
//     incorrect: ResultItem;
// }

// class EndController {
//     public async end(req: Request, res: Response) {
//         const { token } = req.headers;
//         const { id: userId } = jwt.verify(token, process.env.JWT_SECRET);

//         let data = req.body;
//         try {
//             function processItems(data: DataItem[]): Result {
//                 const correct: ResultItem = { count: 0, words: [] };
//                 const incorrect: ResultItem = { count: 0, words: [] };

//                 for (const item of data) {
//                     if (item.inFact == item.answer) {
//                         correct.count++;
//                         correct.words.push(item);
//                     } else if (item.answer) {
//                         incorrect.count++;
//                         incorrect.words.push(item);
//                     }
//                 }

//                 return { correct, incorrect };
//             }

//             const result = processItems(data);

//             const bookIds = [
//                 ...new Set([
//                     ...result.correct.words.map((item) => item.unitId),
//                     ...result.incorrect.words.map((item) => item.unitId),
//                 ]),
//             ];

//             const books = await Book.find({
//                 unitId: { $in: bookIds.map((id) => mongoose.Types.ObjectId(id)) },
//             });

//             const correctWords = result.correct.words.map((word) => {
//                 return { ...word, userId };
//             });

//             const incorrectWords = result.incorrect.words.map((word) => {
//                 return { ...word, userId };
//             });

//             const schema = new mongoose.Schema({
//                 userId: String,
//                 wordId: String,
//                 unitId: String,
//                 engWord: String,
//                 uzbWord: String,
//                 question: String,
//                 role: String,
//             });

//             const CorrectModel = mongoose.model('Correct', schema, 'correct');
//             const IncorrectModel = mongoose.model(
//                 'Incorrect',
//                 schema,
//                 'incorrect'
//             );

//             await CorrectModel.insertMany(
//                 correctWords.map((word) => {
//                     const book = books.find((b) => b.unitId == word.unitId);
//                     return {
//                         userId: word.userId,
//                         wordId: word._id,
//                         unitId: word.unitId,
//                         engWord: word.engWord,
//                         uzbWord: word.uzbWord,
//                         question: word.question,
//                         role: word.role,
//                         bookName: book?.name || '',
//                     };
//                 })
//             );

//             await IncorrectModel.insertMany(
//                 incorrectWords.map((word) => {
//                     const book = books.find((b) => b.unitId == word.unitId);
//                     return {
//                         userId: word.userId,
//                         wordId: word._id,
//                         unitId: word.unitId,
//                         engWord: word.engWord,
//                         uzbWord: word.uzbWord,
//                         question: word.question,
//                         role: word.role,
//                         bookName: book?.name || '',
//                     };
//                 })
//             );

//             res.send({
//                 correct: result.correct,
//                 incorrect: result.incorrect,
//             });
//         } catch (error: unknown) {
//             res.status(500).json({ success: false, error: (error as Error).message });
//         }
//     }
// }

// export default new EndController();