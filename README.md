# FusionSQLite
Run SQL queries on Oracle Fusion Cloud DB instances from the convenience of your desktop.

Ensure your fusion instance account has Integration specialist roles and appropriate folder permissions.

#Steps-

Download the exe file from https://www.dropbox.com/s/e9tbsp8nj26st8s/FusionSQLitev1-1.exe?dl=0 (Updated in Jan 2021 to work around 20d restriction)

Open the exe after bypassing the warnings

Enter your Fusion instance URL (Starting with https:// and ending with .com), Username and password (Basic Auth).

Click on "Initialize environment" for the first time

Enter your SQL statement

Click on "Run Query"

Optionally, you can click on "Export to Excel" to export your result set


#Limitations-

Still planning to add an option to save instance details

Current build uses a data model having a refcursor to handle SQL queries. Will change that in future releases.

Try including ROWNUM explicitly in your queries. The application can handle large data sets (will show "Not responding" briefly before fetching the results) but I'm planning to optimise this soon.


Feel free to use the source code and/or contribute to the GIT repository with your own optimisations, features/additions.
