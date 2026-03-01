export const loginPage = (req, res) => {
  res.render("auth/login", { title: "Login - Procurement System" });
};

export const registerStep1 = (req, res) => {
  res.render("auth/register-step1", { title: "Bidder Registration - Company Setup" });
};

export const registerStep2 = (req, res) => {
  res.render("auth/register-step2", { title: "Bidder Registration - Representative" });
};

export const registerStep3 = (req, res) => {
  res.render("auth/register-step3", { title: "Bidder Registration - Documents" });
};

export const registerSuccess = (req, res) => {
  res.render("auth/register-success", { title: "Registration Verified" });
};
