import dotenv from 'dotenv';
import app from './app';

import log from "./logger";


dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    log.info(`Server is running on port ${PORT}`);
});
