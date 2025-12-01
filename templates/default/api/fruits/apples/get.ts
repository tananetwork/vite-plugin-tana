export default function handler(request: any) {
  return {
    status: 200,
    body: { fruit: "apple", path: request.path },
    headers: { "Content-Type": "application/json" }
  };
}
