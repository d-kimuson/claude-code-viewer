import prexit from "prexit";
import { claudeCodeTaskController } from "../service/claude-code/ClaudeCodeTaskController";
import { eventBus } from "../service/events/EventBus";
import { fileWatcher } from "../service/events/fileWatcher";
import type { InternalEventDeclaration } from "../service/events/InternalEventDeclaration";
import type { ProjectRepository } from "../service/project/ProjectRepository";
import { projectMetaStorage } from "../service/project/projectMetaStorage";
import type { SessionRepository } from "../service/session/SessionRepository";
import { sessionMetaStorage } from "../service/session/sessionMetaStorage";

export const initialize = async (deps: {
  sessionRepository: SessionRepository;
  projectRepository: ProjectRepository;
}): Promise<void> => {
  fileWatcher.startWatching();

  const intervalId = setInterval(() => {
    eventBus.emit("heartbeat", {});
  }, 10 * 1000);

  const onSessionChanged = (
    event: InternalEventDeclaration["sessionChanged"],
  ) => {
    projectMetaStorage.invalidateProject(event.projectId);
    sessionMetaStorage.invalidateSession(event.projectId, event.sessionId);
  };

  eventBus.on("sessionChanged", onSessionChanged);

  try {
    console.log("Initializing projects cache");
    const { projects } = await deps.projectRepository.getProjects();
    console.log(`${projects.length} projects cache initialized`);

    console.log("Initializing sessions cache");
    const results = await Promise.all(
      projects.map((project) => deps.sessionRepository.getSessions(project.id)),
    );
    console.log(
      `${results.reduce(
        (s, { sessions }) => s + sessions.length,
        0,
      )} sessions cache initialized`,
    );
  } catch {
    // do nothing
  }

  prexit(() => {
    clearInterval(intervalId);
    eventBus.off("sessionChanged", onSessionChanged);
    fileWatcher.stop();
    claudeCodeTaskController.abortAllTasks();
  });
};
