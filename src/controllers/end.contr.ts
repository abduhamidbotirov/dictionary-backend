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
            // console.log('resultData :', resultData);
            
            
            res.send({
                books: bookname,
                correct: result.correct,
                incorrect: result.incorrect,
                errorRes: result.error
            });
            if (resultData.correct.words.length || resultData.incorrect.words.length) {
                let answerWithUnit = await findMatchingUnits(resultData)
                const newResult = new ResultSchema({ resultData });
                await newResult.save();
                sendResultsToChannel(newResult.resultData, booksName, answerWithUnit);
            }
        } catch (error: unknown) {
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    }
}


async function sendResultsToChannel(resultData: any, bookname: any, answerWithUnit: any) {
    try {
        const bot = new Telegraf('6357487179:AAHyXXD-WZoGMIUfqZ0jBGEDM5dXnpnmaVg');
        const channelId = '@EssentialWordsResult';

        // Format results for Telegram message
        const formattedResults = formatResults(resultData, bookname, answerWithUnit);

        // Send message to Telegram channel
        await bot.telegram.sendMessage(channelId, formattedResults);
    } catch (error) {
        console.error('Error sending results to Telegram channel:', error);
    }
}

function formatResults(resultData: any, bookname: any, answerWithUnit: any): string {
    let message = `✅ Tog'ri: ${resultData.correct.count}\n`;
    message += `❌ Noto'g'ri: ${resultData.incorrect.count}\n\n`;
    message += `✅ To'g'ri javoblar foizida: ${resultData.correctPercentage}%\n`;
    message += `❌ Noto'g'ri javoblar foizida: ${resultData.incorrectPercentage}%\n\n`;
    // Get unique unit names from correct and incorrect arrays
    const allUnitNames = [...new Set([...answerWithUnit.correct.map((item: any) => item.unitName), ...answerWithUnit.incorrect.map((item: any) => item.unitName)])];

    // Iterate through each unit to display found and not found words
    for (const unitName of allUnitNames) {
        const foundWords = answerWithUnit.correct.filter((item: any) => item.unitName === unitName);
        const notFoundWords = answerWithUnit.incorrect.filter((item: any) => item.unitName === unitName);

        // Display unit name
        message += `\n📚 Unit nomi: ${unitName}\n`;

        // Display found words
        // message += "✅ Topilgan so'zlar:\n";
        // if (foundWords.length > 0) {
        //     for (const word of foundWords) {
        //         message += `    - ${word.uzbWord} (${word.engWord})\n`;
        //     }
        // } else {
        //     message += "    Yo'q\n";
        // }

        // Display not found words
        message += "❌ Topilmagan so'zlar:\n";
        if (notFoundWords.length > 0) {
            for (const word of notFoundWords) {
                message += `    - ${word.uzbWord} (${word.engWord})\n`;
            }
        } else {
            message += "    Yo'q\n";
        }
    }

    return message;
}



async function findMatchingUnits(resultData:any) {
    const correctWords = resultData.correct.words;
    const incorrectWords = resultData.incorrect.words;
    const correct = [];
    const incorrect = [];

    // Find matching words for correct results
    for (const word of correctWords) {
        const unit = await Unit.findById(word.unitId);
        if (unit) {
            correct.push({
                _id: word._id,
                engWord: word.engWord,
                uzbWord: word.uzbWord,
                unitName: unit.unitname,
                question: word.question,
                role: word.role,
                answer: word.answer,
            });
        }
    }
    // Find matching words for incorrect results
    for (const word of incorrectWords) {
        const unit = await Unit.findById(word.unitId);
        if (unit) {
            incorrect.push({
                _id: word._id,
                engWord: word.engWord,
                uzbWord: word.uzbWord,
                unitName: unit.unitname,
                question: word.question,
                role: word.role,
                answer: word.answer,
            });
        }
    }
    return { correct, incorrect };
}
export default new EndController();