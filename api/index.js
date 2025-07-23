export default function handler(req, res) {
  const apiKey = process.env.GOOGLE_API_KEY || "";

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <!-- head content -->
  </head>
  <body>
    <!-- body content -->

    <script>
      window.GOOGLE_API_KEY = "${apiKey}";
    </script>
    <script src="script.js"></script>
  </body>
  </html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}
