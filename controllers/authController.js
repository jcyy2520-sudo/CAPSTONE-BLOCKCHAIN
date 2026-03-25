import { User } from "../models/userModel.js";
import bcrypt from "bcrypt";

export const loginPage = (req, res) => {
  res.render("auth/login", { title: "Login - Procurement System" });
};

export const loginPost = async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    let user = await User.findOne({ where: { email: username } });
    if (!user) {
      user = await User.findOne({ where: { name: username } });
    }

    if (!user) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/login");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/login");
    }

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };

    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    return res.redirect('/bidder/dashboard');
  } catch (err) {
    console.error("Login error:", err);
    req.flash("error_msg", "Login failed");
    return res.redirect("/login");
  }
};

export const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
};
