import "./router/auth/routes";
import "./router/projects/routes";

import { app } from "./app";
import { logger } from "./shared/logger";

app.listen(4000, () => {
  logger.info(
    {
      event: "server_started",
      port: 4000,
      url: "http://localhost:4000",
    },
    "server started",
  );
});
