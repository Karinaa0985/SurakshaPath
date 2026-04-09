// 🔹 FETCH + SHOW DRIVERS WITH STARS + COMMENTS
function render() {
  fetch("http://localhost:5000/drivers")
    .then(res => res.json())
    .then(drivers => {

      let html = "";

      drivers.forEach((d) => {
        html += `
          <div class="card">
            <h3>${d.name}</h3>
            <p>${d.phone}</p>

            <div class="stars">
              ${[1,2,3,4,5].map(x => `
                <span onclick="rate(${d.id}, ${x})"
                  style="cursor:pointer; font-size:20px; color:${x <= (d.rating || 0) ? 'gold' : 'gray'}">
                  ★
                </span>
              `).join("")}
            </div>

            <p>Rating: ${d.rating ?? "Not rated"}</p>

            <!-- 💬 COMMENT SECTION -->
            <input id="c-${d.id}" placeholder="Add comment">
            <button onclick="addComment(${d.id})">Add</button>

            <div id="comments-${d.id}">Loading...</div>
          </div>
        `;
      });

      document.getElementById("list").innerHTML = html;

      // 🔥 load comments
      drivers.forEach(d => loadComments(d.id));
    });
}


// 🔹 ADD DRIVER
function addDriver() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;

  if (!name || !phone) {
    alert("Enter details");
    return;
  }

  fetch("http://localhost:5000/drivers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      phone,
      rating: null
    })
  })
  .then(() => render());

  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
}


// 🔹 UPDATE RATING
function rate(id, rating) {
  fetch(`http://localhost:5000/drivers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ rating })
  })
  .then(() => render());
}


// 🔹 ADD COMMENT (DB)
function addComment(id) {
  const input = document.getElementById(`c-${id}`);
  const text = input.value;

  if (!text) return;

  fetch("http://localhost:5000/comments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      driver_id: id,
      text: text
    })
  })
  .then(() => {
    input.value = "";
    loadComments(id);
  });
}


// 🔹 LOAD COMMENTS
function loadComments(id) {
  fetch(`http://localhost:5000/comments/${id}`)
    .then(res => res.json())
    .then(data => {
      let html = "";

      data.forEach(c => {
        html += `
          <p>
            💬 ${c.text}
            <span onclick="deleteComment(${c.id}, ${id})"
              style="cursor:pointer; margin-left:10px;">
              🗑️
            </span>
          </p>
        `;
      });

      document.getElementById(`comments-${id}`).innerHTML = html;
    });
}


// 🔹 DELETE COMMENT
function deleteComment(commentId, driverId) {
  fetch(`http://localhost:5000/comments/${commentId}`, {
    method: "DELETE"
  })
  .then(() => loadComments(driverId));
}


// 🔹 PAGE LOAD
window.onload = function () {
  render();

  document.getElementById("addBtn").onclick = function () {
    document.getElementById("modal").style.display = "block";
  };

  document.getElementById("closeBtn").onclick = function () {
    document.getElementById("modal").style.display = "none";
  };

  document.getElementById("saveBtn").onclick = function () {
    addDriver();
    document.getElementById("modal").style.display = "none";
  };
};