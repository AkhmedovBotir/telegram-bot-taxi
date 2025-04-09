import { Switch, Route } from "wouter";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/not-found";

function App() {
  return (
    <Switch>
      <Route path="/" component={AdminPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
