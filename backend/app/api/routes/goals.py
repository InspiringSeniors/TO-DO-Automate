from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from datetime import datetime, timezone

from app.db import database, models
from app.schemas import goal as goal_schema
from app.api.dependencies import get_current_user

router = APIRouter()


def _compute_pct(goal: models.Goal) -> float:
    """Compute completion % from activities across all strategies of a goal."""
    total = sum(len(s.activities) for s in goal.strategies)
    if total == 0:
        return 0.0
    completed = sum(
        1 for s in goal.strategies for a in s.activities if a.status == "completed"
    )
    return round(completed / total * 100, 1)


def _resolve_activity_status(activity: models.Activity) -> str:
    """Return 'overdue' if past due and not completed, otherwise stored status."""
    if activity.status != "completed":
        now = datetime.now(timezone.utc)
        due = activity.due_datetime
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if due < now:
            return "overdue"
    return activity.status


def _goal_to_out(goal: models.Goal) -> goal_schema.GoalOut:
    strategies_out = []
    for s in goal.strategies:
        activities_out = []
        for a in s.activities:
            activities_out.append(goal_schema.ActivityOut(
                id=a.id,
                strategy_id=a.strategy_id,
                title=a.title,
                description=a.description,
                due_datetime=a.due_datetime,
                status=_resolve_activity_status(a),
                created_at=a.created_at,
                updated_at=a.updated_at,
            ))
        strategies_out.append(goal_schema.StrategyOut(
            id=s.id,
            goal_id=s.goal_id,
            title=s.title,
            created_at=s.created_at,
            activities=activities_out,
        ))
    return goal_schema.GoalOut(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        created_at=goal.created_at,
        strategies=strategies_out,
        completion_pct=_compute_pct(goal),
    )


def _load_goal(goal_id: UUID, db: Session) -> models.Goal:
    return (
        db.query(models.Goal)
        .options(
            joinedload(models.Goal.strategies).joinedload(models.Strategy.activities)
        )
        .filter(models.Goal.id == goal_id)
        .first()
    )


# ── Goals ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[goal_schema.GoalOut])
def list_goals(
    user_id: UUID = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Goal)
        .options(
            joinedload(models.Goal.strategies).joinedload(models.Strategy.activities)
        )
    )
    if current_user.role != "admin":
        query = query.filter(models.Goal.user_id == current_user.id)
    elif user_id:
        query = query.filter(models.Goal.user_id == user_id)
    goals = query.order_by(models.Goal.created_at.desc()).all()
    return [_goal_to_out(g) for g in goals]


@router.post("", response_model=goal_schema.GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    body: goal_schema.GoalCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = models.Goal(title=body.title, user_id=current_user.id)
    db.add(goal)
    db.commit()
    goal = _load_goal(goal.id, db)
    return _goal_to_out(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal or (goal.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()


# ── Strategies ────────────────────────────────────────────────────────────────

@router.post("/{goal_id}/strategies", response_model=goal_schema.StrategyOut, status_code=status.HTTP_201_CREATED)
def create_strategy(
    goal_id: UUID,
    body: goal_schema.StrategyCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal or (goal.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=404, detail="Goal not found")
    strategy = models.Strategy(title=body.title, goal_id=goal_id)
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return goal_schema.StrategyOut(
        id=strategy.id,
        goal_id=strategy.goal_id,
        title=strategy.title,
        created_at=strategy.created_at,
        activities=[],
    )


@router.delete("/{goal_id}/strategies/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_strategy(
    goal_id: UUID,
    strategy_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    strategy = (
        db.query(models.Strategy)
        .join(models.Goal)
        .filter(models.Strategy.id == strategy_id, models.Goal.id == goal_id)
        .first()
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if strategy.goal.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(strategy)
    db.commit()


# ── Activities ────────────────────────────────────────────────────────────────

@router.post(
    "/{goal_id}/strategies/{strategy_id}/activities",
    response_model=goal_schema.ActivityOut,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    goal_id: UUID,
    strategy_id: UUID,
    body: goal_schema.ActivityCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    strategy = (
        db.query(models.Strategy)
        .join(models.Goal)
        .filter(models.Strategy.id == strategy_id, models.Goal.id == goal_id)
        .first()
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if strategy.goal.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Strategy not found")
    activity = models.Activity(
        strategy_id=strategy_id,
        title=body.title,
        description=body.description,
        due_datetime=body.due_datetime,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return goal_schema.ActivityOut(
        id=activity.id,
        strategy_id=activity.strategy_id,
        title=activity.title,
        description=activity.description,
        due_datetime=activity.due_datetime,
        status=_resolve_activity_status(activity),
        created_at=activity.created_at,
        updated_at=activity.updated_at,
    )


@router.put(
    "/{goal_id}/strategies/{strategy_id}/activities/{activity_id}",
    response_model=goal_schema.ActivityOut,
)
def update_activity(
    goal_id: UUID,
    strategy_id: UUID,
    activity_id: UUID,
    body: goal_schema.ActivityUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    activity = (
        db.query(models.Activity)
        .join(models.Strategy)
        .join(models.Goal)
        .filter(
            models.Activity.id == activity_id,
            models.Strategy.id == strategy_id,
            models.Goal.id == goal_id,
        )
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.strategy.goal.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Activity not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    db.commit()
    db.refresh(activity)
    return goal_schema.ActivityOut(
        id=activity.id,
        strategy_id=activity.strategy_id,
        title=activity.title,
        description=activity.description,
        due_datetime=activity.due_datetime,
        status=_resolve_activity_status(activity),
        created_at=activity.created_at,
        updated_at=activity.updated_at,
    )


@router.delete(
    "/{goal_id}/strategies/{strategy_id}/activities/{activity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_activity(
    goal_id: UUID,
    strategy_id: UUID,
    activity_id: UUID,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    activity = (
        db.query(models.Activity)
        .join(models.Strategy)
        .join(models.Goal)
        .filter(
            models.Activity.id == activity_id,
            models.Strategy.id == strategy_id,
            models.Goal.id == goal_id,
        )
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if activity.strategy.goal.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(activity)
    db.commit()
