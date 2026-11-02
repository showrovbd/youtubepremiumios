import configTemplate from "../youtube-test.conf";
import requestScript from "./dist/request.js.txt";
import responseScript from "./dist/response.js.txt";
import adminPage from "./admin.html";
import licenseText from "./vendor/LICENSE";
import { createService } from "./service.js";
export { LicenseRegistry } from "./service.js";

export default createService({ configTemplate, requestScript, responseScript, adminPage, licenseText });
