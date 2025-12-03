First: cd .\functions ,  npm run build, 
Useful: npx eslint . --fix
Second: firebase deploy --only functions:sendNotificationOnGroupLikeMessageV2
Third: firebase functions:list
Del: firebase functions:delete sendEmailToAdminWhenHaveReportV04