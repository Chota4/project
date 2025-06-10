function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('show');
}

const hamburger = document.getElementById("hamburger");
    const sidebar = document.getElementById("sidebar");

    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar-visible");
    });

