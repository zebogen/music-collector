import type { ActionFunctionArgs } from "react-router";
import { destroyUserSession } from "~/utils/session.server";

export async function action({ request }: ActionFunctionArgs) {
  return destroyUserSession(request);
}
