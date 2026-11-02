import configTemplate from "../../youtube-test.conf";
import requestScript from "../dist/request.js.txt";
import responseScript from "./response.js.txt";
import adminPage from "../admin.html";
import licenseText from "../vendor/LICENSE";
import { processYouTube } from "./processor.js";
import { createRemoteService } from "./service.js";

export default createRemoteService({ configTemplate, requestScript, responseScript, adminPage, licenseText, processYouTube });
