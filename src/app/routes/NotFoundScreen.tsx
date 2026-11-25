/**
 * The page a person reaches by typing a path that does not exist.
 *
 * It lives in its own file so the route table only exports the routes.
 */
export function NotFoundScreen() {
  return (
    <div className="hello">
      <div>
        <h1 className="t-h1">
          That page is <em>not here</em>
        </h1>
        <p>The link may be old, or the screen may have moved.</p>
        <a className="btn" href="/dashboard">
          Go to the dashboard
        </a>
      </div>
    </div>
  );
}
