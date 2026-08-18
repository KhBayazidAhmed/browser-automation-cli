import { join } from "node:path";
import type { TaskDefinition } from "../types.js";

export const formAutomationTask: TaskDefinition = {
	id: "form-submit",
	name: "Interactive Form Automation",
	description:
		"Demonstrates automated form filling, input validation, and submission",
	params: [
		{
			name: "name",
			description: "User name to input",
			default: "John Doe",
		},
		{
			name: "email",
			description: "Email address to input",
			default: "john@example.com",
		},
	],
	async run({ page, args, log, outputDir }) {
		const name = String(args.name || "John Doe");
		const email = String(args.email || "john@example.com");

		const formHtml = encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Form</title>
          <style>
            body { font-family: sans-serif; padding: 30px; }
            .field { margin-bottom: 12px; }
            label { display: block; margin-bottom: 4px; font-weight: bold; }
            input { padding: 8px; width: 280px; }
            button { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
            #status { margin-top: 16px; padding: 12px; display: none; background: #e6ffed; border: 1px solid #34d058; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h2>User Registration Automation</h2>
          <form id="reg-form" onsubmit="event.preventDefault(); document.getElementById('status').style.display='block'; document.getElementById('status').innerText = 'Registration Successful for: ' + document.getElementById('name-input').value;">
            <div class="field">
              <label for="name-input">Full Name</label>
              <input id="name-input" type="text" placeholder="Your name" required />
            </div>
            <div class="field">
              <label for="email-input">Email</label>
              <input id="email-input" type="email" placeholder="Your email" required />
            </div>
            <button id="submit-btn" type="submit">Submit Registration</button>
          </form>
          <div id="status"></div>
        </body>
      </html>
    `);

		log.info("Loading target form...");
		await page.goto(`data:text/html;charset=utf-8,${formHtml}`);

		log.info(`Typing name: "${name}"...`);
		await page.type("#name-input", name);

		log.info(`Typing email: "${email}"...`);
		await page.type("#email-input", email);

		log.info("Submitting form...");
		await page.click("#submit-btn");

		await page.waitForSelector("#status");
		const statusText = await page.getText("#status");
		log.success(`Form submitted! Result: "${statusText}"`);

		const screenshotPath = join(outputDir, "form-submitted.png");
		await page.screenshot({ path: screenshotPath });
		log.success(`Saved confirmation screenshot to: ${screenshotPath}`);

		return {
			submittedName: name,
			submittedEmail: email,
			resultText: statusText,
			screenshot: screenshotPath,
		};
	},
};
