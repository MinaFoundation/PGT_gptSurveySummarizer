import dotenv from "dotenv";
import app from "./app";

import log from "./logger";

dotenv.config();

const GSS_SERVER_PORT = process.env.GSS_SERVER_PORT || 3000;

app.listen(GSS_SERVER_PORT, () => {
  log.info(`Server is running on port ${GSS_SERVER_PORT}`);
});
