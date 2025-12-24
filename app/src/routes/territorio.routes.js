// app/src/routes/territorio.routes.js
import { Router } from "express";
const router = Router();

router.get("/territorio", (req, res) => {
  // Renderiza SOLO el contenido que irá dentro de #view
  res.render("partials/territorio"); 
});

export default router;
