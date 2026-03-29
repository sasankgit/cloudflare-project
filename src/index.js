export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ✅ Handle POST (AI chat)
    if (request.method === "POST" && url.pathname === "/api/chat") {
      const id = env.MY_DURABLE_OBJECT.idFromName("global-chat");
      const obj = env.MY_DURABLE_OBJECT.get(id);
      return obj.fetch(request);
    }

    // ✅ Serve frontend for GET
    return env.ASSETS.fetch(request);
  }
};

// Durable Object
export class MyDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    // Persistent history
    let history = (await this.state.storage.get("history")) || [];

    const { message } = await request.json();

    history.push({ role: "user", content: message });

    const response = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "system", content: "You are a helpful assistant." }, ...history]
    });

    const reply = response.response;

    history.push({ role: "assistant", content: reply });

    // Save to storage
    await this.state.storage.put("history", history);

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
