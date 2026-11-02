@echo off
set PATH=C:\nvm4w\nodejs;%PATH%
echo ========================================================
echo  DEMARRAGE DE FINANCE TUNISIE (LOI 96-112 & NCT 01)
echo ========================================================
echo Lancement du serveur backend TypeScript et API REST...
start cmd /k "npx tsx server/index.ts"
timeout /t 2 /nobreak >nul
echo Lancement du serveur d'interface React + Vite...
start cmd /k "npx vite --open"
echo.
echo Application ouverte dans votre navigateur sur http://localhost:5173
echo Identifiants de connexion : admin / admin123

