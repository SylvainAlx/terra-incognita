export const home = (req, res) => {
  res.render("index", { page: "home" });
};

export const explorer = (req, res) => {
  res.render("explorer", { page: "explorer" });
};

export const about = (req, res) => {
  res.render("about", { page: "about" });
};
