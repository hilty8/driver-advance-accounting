import 'dotenv/config';
import { startServer } from './http/server';

const port = Number(process.env.PORT ?? 3000);
startServer(port);
console.log(`server started on ${port}`);
